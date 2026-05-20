"""Schemas Pydantic para M1 — Canal de denuncia."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Crear denuncia ────────────────────────────────────────────────────────────

class CrearDenunciaRequest(BaseModel):
    modalidad:      Literal["anonima", "identificada"]
    tipo_acoso:     str = Field(min_length=3, max_length=50)
    # Payload E2E: el servidor solo almacena ciphertext. Nunca plaintext.
    ciphertext_b64: str = Field(min_length=10)
    iv_b64:         str = Field(min_length=8, max_length=32)
    # Evidencias ya cifradas en cliente
    evidencias: list["EvidenciaInput"] = Field(default_factory=list, max_length=10)


class EvidenciaInput(BaseModel):
    nombre_archivo:  str = Field(max_length=255)
    tipo_mime:       str = Field(max_length=100)
    tamano_bytes:    int = Field(gt=0, le=52_428_800)  # max 50 MB
    sha256_original: str = Field(min_length=64, max_length=64)
    storage_key:     str = Field(max_length=500)
    iv_b64:          str = Field(min_length=8, max_length=32)


class CrearDenunciaResponse(BaseModel):
    tracking_code:  str
    fecha_registro: datetime
    mensaje:        str = "Denuncia registrada correctamente"


# ── Seguimiento público ───────────────────────────────────────────────────────

class SeguimientoResponse(BaseModel):
    tracking_code:      str
    estado:             str
    tipo_acoso:         str
    modalidad:          str
    ultima_actualizacion: datetime
    mensajes_cifrados:  list["MensajeCifrado"]


class MensajeCifrado(BaseModel):
    id:             UUID
    remitente:      Literal["denunciante", "instructor", "sistema"]
    ciphertext_b64: str
    iv_b64:         str
    leido:          bool
    created_at:     datetime


# ── Mensaje de seguimiento ────────────────────────────────────────────────────

class NuevoMensajeRequest(BaseModel):
    ciphertext_b64: str = Field(min_length=10)
    iv_b64:         str = Field(min_length=8, max_length=32)


# ── Listado para backoffice ───────────────────────────────────────────────────

class DenunciaResumen(BaseModel):
    id:             UUID
    tracking_code:  str
    modalidad:      str
    tipo_acoso:     str
    estado:         str
    gravedad_ia:    str | None
    created_at:     datetime
    updated_at:     datetime


class ListaDenunciasResponse(BaseModel):
    items:  list[DenunciaResumen]
    total:  int
    page:   int
    size:   int


# ── Detalle para Igualdad/RRHH ────────────────────────────────────────────────

class DenunciaDetalle(BaseModel):
    id:             UUID
    tracking_code:  str
    modalidad:      str
    tipo_acoso:     str
    estado:         str
    gravedad_ia:    str | None
    evaluacion_ia:  dict | None
    ciphertext_b64: str          # descifrado en cliente
    iv_b64:         str
    evidencias:     list["EvidenciaResumen"]
    mensajes:       list[MensajeCifrado]
    created_at:     datetime
    updated_at:     datetime


class EvidenciaResumen(BaseModel):
    id:              UUID
    nombre_archivo:  str
    tipo_mime:       str
    tamano_bytes:    int
    sha256_original: str
    iv_b64:          str


# ── Asignar expediente ────────────────────────────────────────────────────────

class AsignarRequest(BaseModel):
    instructor_id: UUID


# ── URL descarga de evidencia ─────────────────────────────────────────────────

class DownloadUrlResponse(BaseModel):
    url:        str
    expires_in: int = 300  # 5 min
