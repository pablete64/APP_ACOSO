"""Schemas Pydantic para M6 — Reporting y Dashboard ejecutivo."""
from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


# ── KPIs ejecutivos ───────────────────────────────────────────────────────────

class KpiDenuncias(BaseModel):
    total: int
    por_estado: dict[str, int]   # {"pendiente":3,"en_instruccion":2,"resuelta":5,...}
    por_tipo: dict[str, int]     # {"moral":4,"sexual":2,"discriminacion":4}
    tiempo_medio_resolucion_dias: float | None
    tasa_resolucion_pct: float   # resuelta+archivada / total * 100


class KpiFormacion(BaseModel):
    trabajadores_con_curso_completado: int
    cobertura_pct: float          # trabajadores con ≥1 certificado / total
    cursos_mas_completados: list[str]


class KpiExpedientes(BaseModel):
    abiertos: int
    cerrados: int
    con_plazos_vencidos: int
    tiempo_medio_instruccion_dias: float | None


class KpiClima(BaseModel):
    indice_global: float | None   # None si no hay encuesta en el periodo
    variacion_vs_anterior: float | None
    dimension_mas_critica: str | None


class ReporteEjecutivo(BaseModel):
    empresa_id: str
    periodo_inicio: date
    periodo_fin: date
    denuncias: KpiDenuncias
    expedientes: KpiExpedientes
    formacion: KpiFormacion
    clima: KpiClima
    generado_en: str              # ISO datetime


# ── Informe de cumplimiento (Inspección de Trabajo) ───────────────────────────

class ItemCumplimiento(BaseModel):
    norma: str                    # "Ley 2/2023 art. 8"
    descripcion: str
    estado: Literal["cumple", "parcial", "pendiente"]
    evidencia: str | None         # p.ej. "Canal activo desde 2026-01-01"


class ReporteCumplimiento(BaseModel):
    empresa_id: str
    fecha_generacion: date
    items: list[ItemCumplimiento]
    porcentaje_cumplimiento: float


# ── Plan de igualdad (informe anual) ──────────────────────────────────────────

class SeccionPlanIgualdad(BaseModel):
    titulo: str
    contenido: str                # texto generado o estadística
    datos: dict | None            # datos adicionales estructurados


class ReportePlanIgualdad(BaseModel):
    empresa_id: str
    año: int
    secciones: list[SeccionPlanIgualdad]
    fecha_generacion: date


# ── Exportación ───────────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    tipo: Literal["ejecutivo", "cumplimiento", "plan_igualdad"]
    formato: Literal["json", "csv", "pdf"]
    periodo_inicio: date
    periodo_fin: date


class ExportResponse(BaseModel):
    url_descarga: str             # URL pre-firmada temporal
    expira_en: str                # ISO datetime
    formato: str
    tamaño_bytes: int | None
