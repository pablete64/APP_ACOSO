"""Alembic env — SafeWork AI multi-tenant migration runner."""
import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool, text

config = context.config
fileConfig(config.config_file_name)

# Sobreescribir URL desde entorno (prioridad sobre alembic.ini)
DATABASE_URL = os.environ.get("DATABASE_URL", "")
if DATABASE_URL:
    config.set_main_option("sqlalchemy.url", DATABASE_URL)

target_metadata = None  # Usamos SQL puro (sin ORM models aquí)


def get_tenant_schemas(connection) -> list[str]:
    """Devuelve los schemas de empresa activos para migrar."""
    result = connection.execute(
        text("SELECT schema_name FROM public.empresas WHERE activa = TRUE ORDER BY schema_name")
    )
    return [row[0] for row in result]


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # 1. Migrar schema public (global)
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table="alembic_version",
            version_table_schema="public",
        )
        with context.begin_transaction():
            context.run_migrations()

        # 2. Migrar cada schema de empresa activo
        tenant_schemas = get_tenant_schemas(connection)
        for schema in tenant_schemas:
            connection.execute(text(f"SET search_path TO {schema}, public"))
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                include_schemas=True,
                version_table="alembic_version",
                version_table_schema=schema,
            )
            with context.begin_transaction():
                context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
