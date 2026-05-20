"""Schemas Pydantic para M2 — Asistente IA."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class CrearSesionRequest(BaseModel):
    # Modalidad del chat: orientacion (libre) o evaluacion (estructurada)
    modo: Literal["orientacion", "evaluacion"] = "orientacion"


class CrearSesionResponse(BaseModel):
    session_id: UUID
    modo: str
    mensaje_bienvenida: str
    expira_en: int  # segundos hasta que caduca la sesión


class MensajeRequest(BaseModel):
    contenido: str = Field(min_length=1, max_length=4000)


class MensajeResponse(BaseModel):
    role: Literal["user", "assistant"]
    contenido: str
    created_at: datetime
    crisis_detectada: bool = False
    pii_detectado: list[str] = Field(default_factory=list)


class HistorialResponse(BaseModel):
    session_id: UUID
    modo: str
    mensajes: list[MensajeResponse]
    created_at: datetime
    expira_en: datetime


class EvaluacionResponse(BaseModel):
    gravedad: Literal["baja", "media", "alta"]
    justificacion_gravedad: str
    reiteracion: Literal["episodio_unico", "patron_repetido", "no_determinado"]
    relacion_poder: Literal["jerarquia", "companeros", "ambos", "no_determinado"]
    impacto_declarado: list[str]
    opciones_disponibles: list[str]
    proximo_paso: str
    derivar_urgente: bool


class DerivarRequest(BaseModel):
    destino: Literal["denuncia", "cita", "inspeccion"]
    # Resumen de la situación (generado por el asistente, no plaintext)
    resumen_cifrado: str | None = None
    iv_b64: str | None = None
