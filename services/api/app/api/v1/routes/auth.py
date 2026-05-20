"""Router de autenticación — /api/v1/auth/*"""
from __future__ import annotations

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_global_session
from app.core.deps import CurrentUserDep
from app.schemas.auth import (
    ChangePasswordRequest,
    EmpresaRegisterRequest,
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    MeResponse,
    MfaEnrollResponse,
    MfaVerifyRequest,
    RefreshResponse,
    ResetPasswordRequest,
)
from app.services.auth_service import AuthError, AuthService
from app.services.empresa_service import EmpresaService

router = APIRouter(prefix="/auth", tags=["Auth"])

_COOKIE_OPTS = dict(
    key="sw_refresh",
    httponly=True,
    secure=True,
    samesite="strict",
    max_age=30 * 24 * 3600,   # 30 días
    path="/api/v1/auth",
)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else (request.client.host or "0.0.0.0")


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, request: Request, response: Response):
    async with get_global_session() as db:
        svc = AuthService(db, _client_ip(request))
        try:
            login_resp, refresh_raw = await svc.login(data)
        except AuthError as e:
            raise HTTPException(status_code=e.status_code, detail=e.message)

    response.set_cookie(value=refresh_raw, **_COOKIE_OPTS)
    return login_resp


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    user: CurrentUserDep,
    sw_refresh: str | None = Cookie(None),
):
    if sw_refresh:
        async with get_global_session() as db:
            svc = AuthService(db, _client_ip(request))
            await svc.logout(sw_refresh, user.id, user.tenant_schema)

    response.delete_cookie("sw_refresh", path="/api/v1/auth")


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_token(request: Request, response: Response, sw_refresh: str | None = Cookie(None)):
    if not sw_refresh:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No hay sesión activa")

    async with get_global_session() as db:
        svc = AuthService(db, _client_ip(request))
        try:
            refresh_resp, new_raw = await svc.refresh(sw_refresh)
        except AuthError as e:
            raise HTTPException(status_code=e.status_code, detail=e.message)

    response.set_cookie(value=new_raw, **_COOKIE_OPTS)
    return refresh_resp


@router.get("/me", response_model=MeResponse)
async def me(user: CurrentUserDep):
    async with get_global_session() as db:
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT nombre, email, mfa_activo FROM public.usuarios WHERE id=:id"),
            {"id": user.id},
        )
        row = result.mappings().first()
        if not row:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return MeResponse(
        id=user.id,
        email=row["email"],
        perfil=user.perfil,
        nombre=row["nombre"],
        empresa_id=user.empresa_id,
        mfa_activo=row["mfa_activo"],
    )


@router.post("/mfa/enroll", response_model=MfaEnrollResponse)
async def mfa_enroll(user: CurrentUserDep):
    async with get_global_session() as db:
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT email FROM public.usuarios WHERE id=:id"), {"id": user.id}
        )
        row = result.mappings().first()
        svc = AuthService(db)
        return await svc.mfa_enroll(user.id, row["email"])


@router.post("/mfa/verify", status_code=status.HTTP_204_NO_CONTENT)
async def mfa_verify(data: MfaVerifyRequest, user: CurrentUserDep):
    async with get_global_session() as db:
        svc = AuthService(db)
        try:
            await svc.mfa_activate(user.id, data.code)
        except AuthError as e:
            raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/password/forgot", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    async with get_global_session() as db:
        svc = AuthService(db, _client_ip(request))
        token_raw = await svc.forgot_password(data.email)
        if token_raw:
            # En dev: loguear el token (en prod: enviar email via SMTP)
            from app.core.config import settings
            if settings.DEBUG:
                import logging
                logging.getLogger("safework").info("Reset token: %s", token_raw)
            # TODO: enviar email con token_raw via servicio SMTP
    # Siempre devuelve 202 (no revelar si el email existe)
    return {"message": "Si el email existe, recibirás instrucciones en breve"}


@router.post("/password/reset", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(data: ResetPasswordRequest):
    async with get_global_session() as db:
        svc = AuthService(db)
        try:
            await svc.reset_password(data.token, data.new_password)
        except AuthError as e:
            raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/empresas/register", status_code=status.HTTP_201_CREATED)
async def register_empresa(data: EmpresaRegisterRequest):
    async with get_global_session() as db:
        svc = EmpresaService(db)
        try:
            result = await svc.register(data)
            return result
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
