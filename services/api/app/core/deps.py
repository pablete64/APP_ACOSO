"""FastAPI dependencies: autenticación, RBAC y sesión de BD por tenant."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_tenant_session, get_global_session
from app.core.security import decode_access_token

# Permisos por perfil — espejo de shared-types/PERMISOS_POR_PERFIL
_PERMISOS: dict[str, set[str]] = {
    "trabajador": {
        "denuncia:crear", "denuncia:seguimiento_propio",
        "asistente:usar", "formacion:ver", "formacion:completar",
        "contacto:solicitar_cita", "contacto:mensajear",
        "clima:responder",
        "apoyo:solicitar_par", "apoyo:registrarse_par",
        "mediacion:solicitar", "represalia:registrar",
    },
    "responsable_igualdad": {
        "denuncia:ver_todas", "denuncia:asignar", "denuncia:comentar",
        "expediente:crear", "expediente:ver", "expediente:gestionar",
        "expediente:exportar",
        "contacto:gestionar", "formacion:gestionar",
        "clima:ver_resultados", "clima:crear_encuesta",
        "reporte:ver_basico", "reporte:ver_completo", "reporte:exportar",
        "usuario:invitar", "usuario:ver",
        "auditoria:ver",
        "mediacion:gestionar", "represalia:ver",
    },
    "rrhh_legal": {
        "denuncia:ver_todas", "denuncia:asignar", "denuncia:ver_detalle",
        "expediente:crear", "expediente:ver", "expediente:gestionar",
        "expediente:firmar", "expediente:exportar",
        "contacto:gestionar", "contacto:mensajear",
        "usuario:gestionar", "usuario:invitar", "usuario:ver",
        "reporte:ver_completo", "reporte:exportar",
        "auditoria:ver", "auditoria:exportar",
        "plan_igualdad:gestionar",
        "mediacion:gestionar", "represalia:ver",
    },
    "direccion": {
        "reporte:ver_completo", "reporte:exportar",
        "clima:ver_resultados", "clima:ver_historico",
        "formacion:ver_estadisticas",
        "plan_igualdad:ver",
    },
    "inspector": {
        "expediente:ver", "expediente:exportar",
        "denuncia:ver_resumen",
        "auditoria:ver", "auditoria:exportar",
        "reporte:ver_completo",
    },
}

_bearer = HTTPBearer(auto_error=False)


class CurrentUser:
    __slots__ = ("id", "empresa_id", "tenant_schema", "perfil", "email")

    def __init__(self, payload: dict) -> None:
        self.id            = payload["sub"]
        self.empresa_id    = payload["empresa_id"]
        self.tenant_schema = payload["tenant_schema"]
        self.perfil        = payload["perfil"]
        self.email         = payload.get("email", "")


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido o expirado")

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tipo de token incorrecto")

    user = CurrentUser(payload)
    # Inyectar en request.state para que TenantMiddleware lo vea
    request.state.tenant_schema = user.tenant_schema
    return user


async def get_current_user_optional(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> CurrentUser | None:
    """Igual que get_current_user pero devuelve None en lugar de 401 si no hay token."""
    if not credentials:
        return None
    try:
        payload = decode_access_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        user = CurrentUser(payload)
        request.state.tenant_schema = user.tenant_schema
        return user
    except JWTError:
        return None


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def require_permission(*permisos: str):
    """Dependencia que exige que el usuario tenga TODOS los permisos indicados."""
    async def _check(user: CurrentUserDep) -> CurrentUser:
        user_perms = _PERMISOS.get(user.perfil, set())
        missing = [p for p in permisos if p not in user_perms]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permisos insuficientes",
            )
        return user
    return Depends(_check)


def require_perfil(*perfiles: str):
    """Dependencia que exige que el usuario tenga uno de los perfiles indicados."""
    async def _check(user: CurrentUserDep) -> CurrentUser:
        if user.perfil not in perfiles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acceso no autorizado para este perfil",
            )
        return user
    return Depends(_check)


async def get_db(user: CurrentUserDep) -> AsyncSession:
    """Sesión de BD fijada al schema del tenant del usuario autenticado."""
    async with get_tenant_session(user.tenant_schema) as session:
        yield session


TenantDBDep = Annotated[AsyncSession, Depends(get_db)]
