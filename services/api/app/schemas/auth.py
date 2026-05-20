"""Schemas Pydantic para los endpoints de autenticación."""
from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field, field_validator
import re

_PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{12,}$"
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    totp_code: str | None = Field(None, pattern=r"^\d{6}$")


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    perfil: str
    nombre: str | None


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=12, max_length=128)
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError(
                "La contraseña debe tener mínimo 12 caracteres, "
                "mayúscula, minúscula, número y carácter especial"
            )
        return v

    def model_post_init(self, __context) -> None:
        if self.new_password != self.confirm_password:
            raise ValueError("Las contraseñas no coinciden")


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError("La contraseña no cumple los requisitos de seguridad")
        return v


class MfaEnrollResponse(BaseModel):
    secret: str
    uri: str           # otpauth:// URI para QR


class MfaVerifyRequest(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class MeResponse(BaseModel):
    id: str
    email: str
    perfil: str
    nombre: str | None
    empresa_id: str
    mfa_activo: bool


class EmpresaRegisterRequest(BaseModel):
    cif: str = Field(pattern=r"^[A-Za-z]\d{7}[A-Za-z0-9]$")
    razon_social: str = Field(min_length=3, max_length=255)
    dpo_email: EmailStr | None = None
    num_empleados: int | None = Field(None, ge=1)
    admin_email: EmailStr
    admin_password: str = Field(min_length=12, max_length=128)
    admin_nombre: str = Field(min_length=2, max_length=255)
    plan_id: str = Field(default="starter", pattern=r"^(starter|professional|enterprise)$")

    @field_validator("admin_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not _PASSWORD_RE.match(v):
            raise ValueError("La contraseña no cumple los requisitos de seguridad")
        return v
