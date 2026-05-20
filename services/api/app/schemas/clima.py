"""Schemas Pydantic para M7 — Termómetro de clima laboral."""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# ── Encuestas ─────────────────────────────────────────────────────────────────

# Dimensiones FPSICO/INSST (Factor Psicosocial — método del INSST)
DimensionFPSICO = Literal[
    "autonomia",
    "carga_trabajo",
    "demandas_cognitivas",
    "variedad_contenido",
    "participacion",
    "interes_compensacion",
    "desempeño_rol",
    "relaciones_apoyo",
]


class PreguntaClima(BaseModel):
    id: str
    texto: str
    dimension: DimensionFPSICO
    escala: Literal["likert5", "likert7", "binaria"] = "likert5"


class EncuestaActiva(BaseModel):
    id: UUID
    titulo: str
    descripcion: str | None
    fecha_inicio: date
    fecha_fin: date
    preguntas: list[PreguntaClima]


class CrearEncuestaRequest(BaseModel):
    titulo: str = Field(..., min_length=5, max_length=200)
    descripcion: str | None = None
    fecha_inicio: date
    fecha_fin: date
    dimensiones: list[DimensionFPSICO] = Field(..., min_length=1)


# ── Respuestas (totalmente anónimas — sin usuario_id) ─────────────────────────

class RespuestaItem(BaseModel):
    pregunta_id: str
    valor: int = Field(..., ge=1, le=7)  # escala 1–5 o 1–7


class EnviarRespuestasRequest(BaseModel):
    encuesta_id: UUID
    departamento: str | None = None   # solo categoría, nunca nombre
    respuestas: list[RespuestaItem] = Field(..., min_length=1)


# ── Indicadores agregados ─────────────────────────────────────────────────────

class IndicadorDimension(BaseModel):
    dimension: DimensionFPSICO
    media: float              # 1.0–7.0
    mediana: float
    desviacion: float
    n_respuestas: int         # nunca < K_ANONIMATO_MIN
    nivel_riesgo: Literal["bajo", "medio", "alto"]
    variacion_pct: float | None  # % vs. periodo anterior


class IndicadoresClima(BaseModel):
    encuesta_id: UUID
    titulo: str
    fecha_inicio: date
    fecha_fin: date
    n_total_respuestas: int
    indice_global: float       # media ponderada 1–7
    suficiente_anonimato: bool  # False si n < K_ANONIMATO_MIN
    dimensiones: list[IndicadorDimension]
    alertas: list[str]          # p. ej. ["relaciones_apoyo en riesgo alto"]
