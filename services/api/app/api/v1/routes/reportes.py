"""Router M6 — Reporting y Dashboard ejecutivo."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission
from app.core.security import CurrentUser
from app.schemas.reportes import (
    ExportRequest,
    ExportResponse,
    ReporteCumplimiento,
    ReporteEjecutivo,
    ReportePlanIgualdad,
)
from app.services.reportes_service import ReportesService

router = APIRouter(prefix="/reportes", tags=["reportes"])


def _svc(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReportesService:
    return ReportesService(db, current_user.empresa_id)


# ── Dashboard ejecutivo ───────────────────────────────────────────────────────

@router.get(
    "/ejecutivo",
    response_model=ReporteEjecutivo,
    dependencies=[Depends(require_permission("reporte:ver_completo"))],
)
async def reporte_ejecutivo(
    periodo_inicio: date = Query(..., description="YYYY-MM-DD"),
    periodo_fin: date = Query(..., description="YYYY-MM-DD"),
    svc: ReportesService = Depends(_svc),
) -> ReporteEjecutivo:
    return await svc.reporte_ejecutivo(periodo_inicio, periodo_fin)


# ── Informe de cumplimiento ───────────────────────────────────────────────────

@router.get(
    "/cumplimiento",
    response_model=ReporteCumplimiento,
    dependencies=[Depends(require_permission("reporte:ver_completo"))],
)
async def reporte_cumplimiento(
    svc: ReportesService = Depends(_svc),
) -> ReporteCumplimiento:
    return await svc.reporte_cumplimiento()


# ── Plan de igualdad ──────────────────────────────────────────────────────────

@router.get(
    "/plan-igualdad",
    response_model=ReportePlanIgualdad,
    dependencies=[Depends(require_permission("reporte:ver_completo"))],
)
async def reporte_plan_igualdad(
    año: int = Query(..., ge=2020, le=2100, description="Año del informe"),
    svc: ReportesService = Depends(_svc),
) -> ReportePlanIgualdad:
    return await svc.reporte_plan_igualdad(año)


# ── Exportación ───────────────────────────────────────────────────────────────

@router.post(
    "/export",
    response_model=ExportResponse,
    dependencies=[Depends(require_permission("reporte:exportar"))],
)
async def exportar(
    body: ExportRequest,
    svc: ReportesService = Depends(_svc),
) -> ExportResponse:
    return await svc.exportar(body)
