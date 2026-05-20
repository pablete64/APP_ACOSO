"""Validación de JWT emitidos por el servicio api Python."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)


class CurrentUser:
    __slots__ = ("id", "empresa_id", "tenant_schema", "perfil")

    def __init__(self, payload: dict) -> None:
        self.id            = payload["sub"]
        self.empresa_id    = payload.get("empresa_id")
        self.tenant_schema = payload.get("tenant_schema")
        self.perfil        = payload.get("perfil")


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> CurrentUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=["HS256"],
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Tipo de token incorrecto")
    return CurrentUser(payload)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
