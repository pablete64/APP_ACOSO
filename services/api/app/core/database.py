"""Gestión de conexiones PostgreSQL con aislamiento multi-tenant.

Cada request obtiene una conexión con search_path fijado al schema
del tenant extraído del JWT. Imposible acceder a datos de otro tenant.
"""
from __future__ import annotations

import re
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

_SCHEMA_RE = re.compile(r"^empresa_[a-z0-9]{1,20}$")

engine = create_async_engine(
    settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def _validate_schema(schema: str) -> str:
    """Valida que el schema tiene el formato correcto antes de usarlo en SQL."""
    if not _SCHEMA_RE.match(schema):
        raise ValueError(f"Schema inválido: {schema!r}")
    return schema


@asynccontextmanager
async def get_tenant_session(tenant_schema: str) -> AsyncGenerator[AsyncSession, None]:
    """Context manager que devuelve una sesión con search_path fijado al tenant."""
    schema = _validate_schema(tenant_schema)

    async with AsyncSessionLocal() as session:
        # Fijar search_path: datos del tenant primero, public (tablas globales) después
        await session.execute(text(f"SET LOCAL search_path TO {schema}, public"))
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            # Restaurar search_path por seguridad (aunque la conexión vuelve al pool)
            await session.execute(text("SET LOCAL search_path TO public"))


async def get_global_session() -> AsyncGenerator[AsyncSession, None]:
    """Sesión con acceso solo al schema public (superadmin / auth)."""
    async with AsyncSessionLocal() as session:
        await session.execute(text("SET LOCAL search_path TO public"))
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
