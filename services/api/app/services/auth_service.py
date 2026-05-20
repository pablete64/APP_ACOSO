"""Lógica de negocio de autenticación: login, logout, refresh, MFA, reset."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    generate_reset_token,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    needs_rehash,
    sha256_ip,
    verify_password,
    verify_totp,
)
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    MfaEnrollResponse,
    RefreshResponse,
)

# Constantes de rate limiting
_MAX_ATTEMPTS   = 5
_LOCKOUT_MIN    = 15
_RESET_TTL_SEC  = 3600  # 1 hora


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 401) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def _get_redis() -> aioredis.Redis:
    return await aioredis.from_url(settings.REDIS_URL, decode_responses=True)


class AuthService:
    def __init__(self, db: AsyncSession, client_ip: str = "0.0.0.0") -> None:
        self.db = db
        self.ip_hash = sha256_ip(client_ip)

    # ── Login ────────────────────────────────────────────────────────────────

    async def login(self, data: LoginRequest) -> tuple[LoginResponse, str]:
        """
        Devuelve (LoginResponse, refresh_token_raw).
        Lanza AuthError en cualquier fallo de autenticación.
        """
        r = await _get_redis()

        # Rate limiting por IP
        ip_key = f"rl:login:ip:{self.ip_hash}"
        attempts = await r.incr(ip_key)
        if attempts == 1:
            await r.expire(ip_key, _LOCKOUT_MIN * 60)
        if attempts > _MAX_ATTEMPTS * 2:
            raise AuthError("Demasiados intentos. Inténtalo más tarde.", 429)

        # Buscar usuario (schema public)
        result = await self.db.execute(
            text("""
                SELECT u.id, u.password_hash, u.perfil, u.nombre, u.activo,
                       u.intentos_fallidos, u.bloqueado_hasta, u.mfa_activo,
                       u.mfa_secret, u.empresa_id,
                       e.schema_name AS tenant_schema
                FROM public.usuarios u
                JOIN public.empresas e ON e.id = u.empresa_id
                WHERE u.email = :email AND e.activa = TRUE
            """),
            {"email": data.email},
        )
        row = result.mappings().first()

        if row is None:
            await self._audit("LOGIN_FALLO", None, None)
            raise AuthError("Credenciales incorrectas")

        # Lockout temporal
        if row["bloqueado_hasta"] and row["bloqueado_hasta"] > datetime.now(timezone.utc):
            raise AuthError("Cuenta bloqueada temporalmente. Inténtalo más tarde.", 423)

        if not row["activo"]:
            raise AuthError("Cuenta desactivada. Contacta con tu administrador.")

        # Verificar contraseña
        if not verify_password(data.password, row["password_hash"]):
            await self._increment_failed(row["id"])
            await self._audit("LOGIN_FALLO", row["id"], row["tenant_schema"])
            raise AuthError("Credenciales incorrectas")

        # Verificar MFA si está activo
        if row["mfa_activo"]:
            if not data.totp_code:
                raise AuthError("Se requiere código MFA", 403)
            if not verify_totp(row["mfa_secret"], data.totp_code):
                await self._audit("MFA_FALLO", row["id"], row["tenant_schema"])
                raise AuthError("Código MFA incorrecto", 403)

        # Resetear intentos fallidos
        await self.db.execute(
            text("UPDATE public.usuarios SET intentos_fallidos=0, bloqueado_hasta=NULL WHERE id=:id"),
            {"id": row["id"]},
        )

        # Rehash si los parámetros de Argon2 cambiaron
        if needs_rehash(row["password_hash"]):
            new_hash = hash_password(data.password)
            await self.db.execute(
                text("UPDATE public.usuarios SET password_hash=:h WHERE id=:id"),
                {"h": new_hash, "id": row["id"]},
            )

        await self.db.commit()
        await r.delete(ip_key)

        # Crear tokens
        access_token = create_access_token(
            sub=str(row["id"]),
            tenant_schema=row["tenant_schema"],
            perfil=row["perfil"],
            empresa_id=str(row["empresa_id"]),
        )
        refresh_raw, refresh_hash = create_refresh_token()

        # Guardar refresh token en BD
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.REFRESH_TOKEN_EXPIRES_IN)
        await self.db.execute(
            text("""
                INSERT INTO public.refresh_tokens (usuario_id, token_hash, expires_at, ip_hash)
                VALUES (:uid, :hash, :exp, :ip)
            """),
            {"uid": row["id"], "hash": refresh_hash, "exp": expires_at, "ip": self.ip_hash},
        )
        await self.db.commit()

        await self._audit("LOGIN_OK", row["id"], row["tenant_schema"])

        return LoginResponse(
            access_token=access_token,
            expires_in=settings.JWT_EXPIRES_IN,
            perfil=row["perfil"],
            nombre=row["nombre"],
        ), refresh_raw

    # ── Logout ───────────────────────────────────────────────────────────────

    async def logout(self, refresh_token_raw: str, user_id: str, tenant_schema: str) -> None:
        token_hash = hashlib.sha256(refresh_token_raw.encode()).hexdigest()
        await self.db.execute(
            text("UPDATE public.refresh_tokens SET revocado=TRUE WHERE token_hash=:h AND usuario_id=:uid"),
            {"h": token_hash, "uid": user_id},
        )
        await self.db.commit()
        await self._audit("LOGOUT", user_id, tenant_schema)

    # ── Refresh ──────────────────────────────────────────────────────────────

    async def refresh(self, refresh_token_raw: str) -> RefreshResponse:
        token_hash = hashlib.sha256(refresh_token_raw.encode()).hexdigest()

        result = await self.db.execute(
            text("""
                SELECT rt.id, rt.usuario_id, rt.expires_at, rt.revocado,
                       u.perfil, u.empresa_id, u.activo,
                       e.schema_name AS tenant_schema
                FROM public.refresh_tokens rt
                JOIN public.usuarios u ON u.id = rt.usuario_id
                JOIN public.empresas e ON e.id = u.empresa_id
                WHERE rt.token_hash = :hash
            """),
            {"hash": token_hash},
        )
        row = result.mappings().first()

        if not row or row["revocado"] or not row["activo"]:
            raise AuthError("Refresh token inválido", 401)

        if row["expires_at"] < datetime.now(timezone.utc):
            raise AuthError("Refresh token expirado", 401)

        # Rotación: revocar el actual y emitir uno nuevo
        await self.db.execute(
            text("UPDATE public.refresh_tokens SET revocado=TRUE WHERE id=:id"),
            {"id": row["id"]},
        )

        new_access = create_access_token(
            sub=str(row["usuario_id"]),
            tenant_schema=row["tenant_schema"],
            perfil=row["perfil"],
            empresa_id=str(row["empresa_id"]),
        )
        new_raw, new_hash = create_refresh_token()
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.REFRESH_TOKEN_EXPIRES_IN)
        await self.db.execute(
            text("""
                INSERT INTO public.refresh_tokens (usuario_id, token_hash, expires_at, ip_hash)
                VALUES (:uid, :hash, :exp, :ip)
            """),
            {"uid": row["usuario_id"], "hash": new_hash, "exp": expires_at, "ip": self.ip_hash},
        )
        await self.db.commit()

        # El nuevo refresh token se devuelve via cookie httpOnly en el router
        return RefreshResponse(access_token=new_access, expires_in=settings.JWT_EXPIRES_IN), new_raw

    # ── MFA ──────────────────────────────────────────────────────────────────

    async def mfa_enroll(self, user_id: str, email: str) -> MfaEnrollResponse:
        secret = generate_totp_secret()
        uri    = get_totp_uri(secret, email)
        # Guardar secret (en prod: cifrado con master key)
        await self.db.execute(
            text("UPDATE public.usuarios SET mfa_secret=:s WHERE id=:id"),
            {"s": secret, "id": user_id},
        )
        await self.db.commit()
        return MfaEnrollResponse(secret=secret, uri=uri)

    async def mfa_activate(self, user_id: str, code: str) -> None:
        result = await self.db.execute(
            text("SELECT mfa_secret FROM public.usuarios WHERE id=:id"),
            {"id": user_id},
        )
        row = result.mappings().first()
        if not row or not row["mfa_secret"]:
            raise AuthError("MFA no inicializado", 400)
        if not verify_totp(row["mfa_secret"], code):
            raise AuthError("Código incorrecto", 400)
        await self.db.execute(
            text("UPDATE public.usuarios SET mfa_activo=TRUE WHERE id=:id"),
            {"id": user_id},
        )
        await self.db.commit()

    # ── Reset de contraseña ───────────────────────────────────────────────────

    async def forgot_password(self, email: str) -> str | None:
        """Genera token de reset. Devuelve el token raw (para enviar por email)."""
        result = await self.db.execute(
            text("SELECT id FROM public.usuarios WHERE email=:email AND activo=TRUE"),
            {"email": email},
        )
        row = result.mappings().first()
        if not row:
            return None  # No revelar si el email existe

        raw, hashed = generate_reset_token()
        r = await _get_redis()
        # Guardar en Redis con TTL de 1 hora
        await r.setex(f"pwd_reset:{hashed}", _RESET_TTL_SEC, str(row["id"]))
        await self._audit("PASSWORD_RESET_SOLICITADO", str(row["id"]), None)
        return raw

    async def reset_password(self, token_raw: str, new_password: str) -> None:
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()
        r = await _get_redis()
        user_id = await r.get(f"pwd_reset:{token_hash}")
        if not user_id:
            raise AuthError("Token de reset inválido o expirado", 400)

        new_hash = hash_password(new_password)
        await self.db.execute(
            text("UPDATE public.usuarios SET password_hash=:h, intentos_fallidos=0 WHERE id=:id"),
            {"h": new_hash, "id": user_id},
        )
        # Revocar todos los refresh tokens del usuario
        await self.db.execute(
            text("UPDATE public.refresh_tokens SET revocado=TRUE WHERE usuario_id=:id"),
            {"id": user_id},
        )
        await self.db.commit()
        await r.delete(f"pwd_reset:{token_hash}")
        await self._audit("PASSWORD_RESET_OK", user_id, None)

    # ── Helpers privados ─────────────────────────────────────────────────────

    async def _increment_failed(self, user_id: str) -> None:
        result = await self.db.execute(
            text("SELECT intentos_fallidos FROM public.usuarios WHERE id=:id"),
            {"id": user_id},
        )
        row = result.mappings().first()
        new_count = (row["intentos_fallidos"] or 0) + 1
        bloqueado_hasta = None
        if new_count >= _MAX_ATTEMPTS:
            bloqueado_hasta = datetime.now(timezone.utc) + timedelta(minutes=_LOCKOUT_MIN)
        await self.db.execute(
            text("""
                UPDATE public.usuarios
                SET intentos_fallidos=:c, bloqueado_hasta=:b
                WHERE id=:id
            """),
            {"c": new_count, "b": bloqueado_hasta, "id": user_id},
        )
        await self.db.commit()

    async def _audit(self, accion: str, user_id: str | None, tenant_schema: str | None) -> None:
        if tenant_schema:
            table = f"{tenant_schema}.audit_log"
        else:
            table = "public.auditoria_global"
        try:
            await self.db.execute(
                text(f"INSERT INTO {table} (usuario_id, accion, recurso, ip_hash) VALUES (:u, :a, 'auth', :ip)"),
                {"u": user_id, "a": accion, "ip": self.ip_hash},
            )
            await self.db.commit()
        except Exception:
            pass  # El audit no debe romper el flujo principal
