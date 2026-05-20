"""Schemas Pydantic para M3 — Formación y recursos."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Cursos ────────────────────────────────────────────────────────────────────

class ModuloResumen(BaseModel):
    id:              UUID
    titulo:          str
    orden:           int
    duracion_minutos: int
    tipo:            Literal["video", "texto", "quiz"]
    completado:      bool = False
    puntuacion:      int | None = None   # 0-100 si ya hizo el quiz


class CursoResumen(BaseModel):
    id:              UUID
    titulo:          str
    descripcion:     str
    perfiles_destino: list[str]
    duracion_total_minutos: int
    num_modulos:     int
    inscrito:        bool
    progreso_pct:    int          # 0–100
    certificado_id:  UUID | None  # si completado


class CursoDetalle(BaseModel):
    id:              UUID
    titulo:          str
    descripcion:     str
    objetivos:       list[str]
    perfiles_destino: list[str]
    duracion_total_minutos: int
    modulos:         list[ModuloResumen]
    inscrito:        bool
    progreso_pct:    int
    certificado_id:  UUID | None


# ── Progreso ──────────────────────────────────────────────────────────────────

class CompletarModuloRequest(BaseModel):
    puntuacion: int | None = Field(None, ge=0, le=100)  # solo para quiz


class CompletarModuloResponse(BaseModel):
    modulo_id:       UUID
    completado:      bool
    certificado_id:  UUID | None  # emitido si se completó el curso entero


# ── Certificados ──────────────────────────────────────────────────────────────

class CertificadoResponse(BaseModel):
    id:           UUID
    usuario_id:   UUID
    curso_id:     UUID
    curso_titulo: str
    emitido_en:   datetime
    url_pdf:      str | None   # URL firmada temporal


# ── Biblioteca normativa ──────────────────────────────────────────────────────

class RecursoNormativo(BaseModel):
    id:          UUID
    titulo:      str
    tipo:        Literal["ley", "reglamento", "guia", "jurisprudencia", "protocolo"]
    organismo:   str
    url:         str
    fecha:       str            # "2023-02-20" o "2023"
    resumen:     str | None
    etiquetas:   list[str]
