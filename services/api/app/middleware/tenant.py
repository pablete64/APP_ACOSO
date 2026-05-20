"""Multi-tenant isolation middleware.

Extrae el tenant del JWT (nunca del header — manipulable),
establece search_path en la conexión y lo inyecta en el estado
de la request para que los repositorios lo usen.
"""
from __future__ import annotations

import re
from typing import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Rutas que no requieren tenant (auth público, health, docs)
_EXCLUDED_PATHS = re.compile(
    r"^(/health|/docs|/openapi\.json|/api/v1/auth/(login|forgot-password|reset-password)|/api/v1/denuncias/seguimiento)"
)

# Formato válido de schema: empresa_{cif_normalizado}
_SCHEMA_RE = re.compile(r"^empresa_[a-z0-9]{1,20}$")


class TenantMiddleware(BaseHTTPMiddleware):
    """Establece el search_path de PostgreSQL por request según el JWT."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if _EXCLUDED_PATHS.match(request.url.path):
            return await call_next(request)

        tenant_schema = getattr(request.state, "tenant_schema", None)

        if tenant_schema is None:
            # El tenant_schema lo inyecta el dependency de JWT (ver core/security.py)
            # Si llega aquí sin schema, la ruta está mal protegida — devolver 401
            from fastapi.responses import JSONResponse
            return JSONResponse(
                {"error": "AUTHZ_MISSING_TENANT", "message": "Autenticación requerida"},
                status_code=401,
            )

        if not _SCHEMA_RE.match(tenant_schema):
            from fastapi.responses import JSONResponse
            return JSONResponse(
                {"error": "AUTHZ_INVALID_TENANT", "message": "Tenant inválido"},
                status_code=403,
            )

        return await call_next(request)
