"""Schemas Pydantic para M8 — Mediación, pares de apoyo y represalias."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Pares de apoyo ────────────────────────────────────────────────────────────

class ParApoyo(BaseModel):
    id: UUID
    usuario_id: UUID
    nombre_visible: str           # nombre o iniciales según preferencia
    departamento: str | None
    idiomas: list[str]
    disponible: bool
    formacion_completada: bool


class RegistrarParRequest(BaseModel):
    consentimiento_explicito: bool = Field(..., description="Debe ser True para registrarse")
    nombre_visible: str = Field(..., min_length=2, max_length=80)
    departamento: str | None = None
    idiomas: list[str] = Field(default_factory=lambda: ["es"])


# ── Mediaciones ───────────────────────────────────────────────────────────────

class SolicitarMediacionRequest(BaseModel):
    expediente_id: UUID | None = None    # puede no estar vinculada a expediente
    motivo_ciphertext: str = Field(..., description="Motivo cifrado en cliente AES-256-GCM")
    motivo_iv_b64: str
    consentimiento_ambas_partes: bool = Field(
        ...,
        description="Ambas partes han expresado consentimiento previo"
    )


class MediacionResumen(BaseModel):
    id: UUID
    expediente_id: UUID | None
    mediador_id: UUID | None
    estado: Literal["solicitada", "en_proceso", "completada", "cancelada"]
    created_at: datetime
    updated_at: datetime


class ActualizarMediacionRequest(BaseModel):
    estado: Literal["en_proceso", "completada", "cancelada"]
    acuerdo_ciphertext: str | None = None   # solo si completada
    acuerdo_iv_b64: str | None = None
    mediador_id: UUID | None = None


# ── Represalias ───────────────────────────────────────────────────────────────

class RegistrarRepresaliaRequest(BaseModel):
    denuncia_id: UUID | None = None          # denuncia previa relacionada
    descripcion_ciphertext: str = Field(..., description="Descripción cifrada AES-256-GCM")
    descripcion_iv_b64: str


class RepresaliaResumen(BaseModel):
    id: UUID
    denuncia_id: UUID | None
    estado: Literal["registrada", "investigando", "resuelta"]
    created_at: datetime
