"""Schemas Pydantic para M4 — Línea de contacto."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Personas designadas ───────────────────────────────────────────────────────

class PersonaDesignadaResumen(BaseModel):
    id:           UUID
    nombre:       str
    rol:          str
    email_contacto: str | None
    idiomas:      list[str]
    disponible:   bool
    avatar_url:   str | None


class PersonaDesignadaDetalle(PersonaDesignadaResumen):
    biografia_corta: str | None
    horario:         str | None  # ej. "L-V 9-14h"
    modalidades:     list[Literal["presencial", "telefonica", "videollamada"]]


# ── Mensajes internos (E2E cifrados) ─────────────────────────────────────────

class EnviarMensajeRequest(BaseModel):
    destinatario_id: UUID
    ciphertext_b64:  str = Field(min_length=10)
    iv_b64:          str = Field(min_length=8, max_length=32)


class MensajeInternoResponse(BaseModel):
    id:              UUID
    remitente_id:    UUID
    destinatario_id: UUID
    ciphertext_b64:  str
    iv_b64:          str
    leido:           bool
    created_at:      datetime


class ConversacionResumen(BaseModel):
    interlocutor_id:   UUID
    interlocutor_nombre: str
    ultimo_mensaje_at: datetime
    no_leidos:         int


# ── Citas ─────────────────────────────────────────────────────────────────────

class CrearCitaRequest(BaseModel):
    persona_designada_id: UUID
    modalidad:  Literal["presencial", "telefonica", "videollamada"]
    fecha_propuesta: datetime
    # Motivo cifrado en cliente — servidor almacena solo ciphertext
    motivo_ciphertext: str = Field(min_length=10)
    motivo_iv_b64:     str = Field(min_length=8, max_length=32)


class CitaResponse(BaseModel):
    id:                  UUID
    solicitante_id:      UUID
    persona_designada_id: UUID
    modalidad:           str
    fecha_propuesta:     datetime
    fecha_confirmada:    datetime | None
    estado:              Literal["pendiente", "confirmada", "cancelada", "completada"]
    motivo_ciphertext:   str
    motivo_iv_b64:       str
    enlace_videollamada: str | None
    created_at:          datetime
    updated_at:          datetime


class ActualizarCitaRequest(BaseModel):
    estado:           Literal["confirmada", "cancelada"]
    fecha_confirmada: datetime | None = None
    enlace_videollamada: str | None = None
