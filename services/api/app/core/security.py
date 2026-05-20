"""Criptografía de identidad: Argon2id, JWT RS256, TOTP, tokens seguros."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any

import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from jose import JWTError, jwt

from app.core.config import settings

# ── Argon2id — parámetros OWASP 2023 ────────────────────────────────────────
# memory: 64 MiB, iterations: 3, parallelism: 4
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,   # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
    encoding="utf-8",
)


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    return _ph.check_needs_rehash(hashed)


# ── JWT RS256 ────────────────────────────────────────────────────────────────
# La clave privada se carga desde variable de entorno como PEM.
# En dev se puede usar una clave generada al vuelo.

def _load_private_key() -> str:
    key = settings.JWT_PRIVATE_KEY
    if key:
        return key.replace("\\n", "\n")
    # Fallback para desarrollo (HS256 con secret)
    return settings.JWT_SECRET


def _load_public_key() -> str:
    key = settings.JWT_PUBLIC_KEY
    if key:
        return key.replace("\\n", "\n")
    return settings.JWT_SECRET


def _algorithm() -> str:
    return "RS256" if settings.JWT_PRIVATE_KEY else "HS256"


def create_access_token(
    *,
    sub: str,
    tenant_schema: str,
    perfil: str,
    empresa_id: str,
    extra: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": sub,
        "tenant_schema": tenant_schema,
        "perfil": perfil,
        "empresa_id": empresa_id,
        "iat": now,
        "exp": now + timedelta(seconds=settings.JWT_EXPIRES_IN),
        "type": "access",
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, _load_private_key(), algorithm=_algorithm())


def create_refresh_token() -> tuple[str, str]:
    """Devuelve (token_raw, token_hash). Solo el hash se almacena en BD."""
    raw = secrets.token_urlsafe(48)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed


def decode_access_token(token: str) -> dict[str, Any]:
    """Lanza JWTError si el token es inválido o expirado."""
    return jwt.decode(token, _load_public_key(), algorithms=[_algorithm()])


# ── Rate limiting helpers ────────────────────────────────────────────────────

def sha256_ip(ip: str) -> str:
    """Hash de IP para audit_log (no reversible, conforme RGPD)."""
    return hashlib.sha256(ip.encode()).hexdigest()


# ── TOTP / MFA ───────────────────────────────────────────────────────────────

def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email,
        issuer_name="SafeWork AI",
    )


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    # valid_window=1 tolera ±30s de desfase de reloj
    return totp.verify(code, valid_window=1)


# ── Tokens de reset de contraseña ────────────────────────────────────────────

def generate_reset_token() -> tuple[str, str]:
    """Devuelve (token_raw, token_hash). TTL de 1 hora."""
    raw = secrets.token_urlsafe(32)
    hashed = hashlib.sha256(raw.encode()).hexdigest()
    return raw, hashed
