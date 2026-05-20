"""Router M7 — Termómetro de clima laboral."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission
from app.core.security import CurrentUser
from app.schemas.clima import (
    CrearEncuestaRequest,
    EncuestaActiva,
    EnviarRespuestasRequest,
    IndicadoresClima,
)
from app.services.clima_service import ClimaService

router = APIRouter(prefix="/clima", tags=["clima"])


def _svc(db: AsyncSession = Depends(get_db)) -> ClimaService:
    return ClimaService(db)


# ── Encuestas ─────────────────────────────────────────────────────────────────

@router.post(
    "/encuestas",
    status_code=201,
    dependencies=[Depends(require_permission("clima:crear_encuesta"))],
)
async def crear_encuesta(
    body: CrearEncuestaRequest,
    svc: ClimaService = Depends(_svc),
) -> dict:
    encuesta_id = await svc.crear_encuesta(body)
    return {"id": str(encuesta_id)}


@router.get("/encuestas/activas", response_model=list[EncuestaActiva])
async def encuestas_activas(
    _: CurrentUser = Depends(get_current_user),
    svc: ClimaService = Depends(_svc),
) -> list[EncuestaActiva]:
    return await svc.encuestas_activas()


# ── Respuestas (totalmente anónimas) ──────────────────────────────────────────

@router.post("/respuestas", status_code=204)
async def registrar_respuestas(
    body: EnviarRespuestasRequest,
    _: CurrentUser = Depends(get_current_user),
    svc: ClimaService = Depends(_svc),
) -> None:
    """Anónimo total: sin usuario_id. Solo se almacena departamento (opcional) y fecha."""
    await svc.registrar_respuestas(body)


# ── Indicadores (solo roles con acceso a clima) ───────────────────────────────

@router.get(
    "/indicadores/{encuesta_id}",
    response_model=IndicadoresClima,
    dependencies=[Depends(require_permission("clima:ver_resultados"))],
)
async def indicadores(
    encuesta_id: UUID,
    svc: ClimaService = Depends(_svc),
) -> IndicadoresClima:
    resultado = await svc.indicadores(encuesta_id)
    if not resultado:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    return resultado
