"""Router M8 — Mediación, pares de apoyo y represalias."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_permission
from app.core.security import CurrentUser
from app.schemas.mediacion import (
    ActualizarMediacionRequest,
    MediacionResumen,
    ParApoyo,
    RegistrarParRequest,
    RegistrarRepresaliaRequest,
    RepresaliaResumen,
    SolicitarMediacionRequest,
)
from app.services.mediacion_service import MediacionService

router = APIRouter(prefix="/apoyo", tags=["mediacion"])


def _svc(db: AsyncSession = Depends(get_db)) -> MediacionService:
    return MediacionService(db)


# ── Pares de apoyo ────────────────────────────────────────────────────────────

@router.get("/pares", response_model=list[ParApoyo])
async def listar_pares(
    _: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> list[ParApoyo]:
    return await svc.listar_pares()


@router.post("/pares/registrarse", status_code=201)
async def registrarse_como_par(
    body: RegistrarParRequest,
    current_user: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> dict:
    if not body.consentimiento_explicito:
        raise HTTPException(
            status_code=422,
            detail="Se requiere consentimiento explícito para registrarse como par de apoyo.",
        )
    try:
        par_id = await svc.registrar_par(UUID(current_user.id), body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id": str(par_id)}


@router.delete("/pares/baja", status_code=204)
async def darse_de_baja_como_par(
    current_user: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> None:
    """Opt-out voluntario en cualquier momento."""
    await svc.dar_de_baja(UUID(current_user.id))


# ── Mediaciones ───────────────────────────────────────────────────────────────

@router.post("/mediaciones", response_model=dict, status_code=201)
async def solicitar_mediacion(
    body: SolicitarMediacionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> dict:
    if not body.consentimiento_ambas_partes:
        raise HTTPException(
            status_code=422,
            detail="La mediación requiere consentimiento explícito de ambas partes.",
        )
    mediacion_id = await svc.solicitar_mediacion(UUID(current_user.id), body)
    return {"id": str(mediacion_id)}


@router.get("/mediaciones", response_model=list[MediacionResumen])
async def listar_mediaciones(
    current_user: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> list[MediacionResumen]:
    es_gestor = current_user.perfil in ("responsable_igualdad", "rrhh_legal")
    return await svc.listar_mediaciones(UUID(current_user.id), es_gestor)


@router.get("/mediaciones/{mediacion_id}", response_model=MediacionResumen)
async def detalle_mediacion(
    mediacion_id: UUID,
    _: CurrentUser = Depends(require_permission("mediacion:gestionar")),
    svc: MediacionService = Depends(_svc),
) -> MediacionResumen:
    m = await svc.detalle_mediacion(mediacion_id)
    if not m:
        raise HTTPException(status_code=404, detail="Mediación no encontrada")
    return m


@router.patch(
    "/mediaciones/{mediacion_id}",
    response_model=MediacionResumen,
    dependencies=[Depends(require_permission("mediacion:gestionar"))],
)
async def actualizar_mediacion(
    mediacion_id: UUID,
    body: ActualizarMediacionRequest,
    svc: MediacionService = Depends(_svc),
) -> MediacionResumen:
    m = await svc.actualizar_mediacion(mediacion_id, body)
    if not m:
        raise HTTPException(status_code=404, detail="Mediación no encontrada")
    return m


@router.delete("/mediaciones/{mediacion_id}", status_code=204)
async def cancelar_mediacion(
    mediacion_id: UUID,
    _: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> None:
    """Opt-out garantizado en cualquier momento (Directiva 2019/1937)."""
    await svc.cancelar_mediacion(mediacion_id)


# ── Represalias ───────────────────────────────────────────────────────────────

@router.post("/represalias", response_model=dict, status_code=201)
async def registrar_represalia(
    body: RegistrarRepresaliaRequest,
    current_user: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> dict:
    """
    Registro de represalia ligada a denuncia previa.
    El contenido va cifrado en origen — el servidor solo almacena ciphertext + IV.
    Alerta inmediata generada en Igualdad + RRHH (implementación vía audit_log + notificación F12).
    """
    represalia_id = await svc.registrar_represalia(UUID(current_user.id), body)
    return {"id": str(represalia_id)}


@router.get("/represalias", response_model=list[RepresaliaResumen])
async def listar_represalias(
    current_user: CurrentUser = Depends(get_current_user),
    svc: MediacionService = Depends(_svc),
) -> list[RepresaliaResumen]:
    es_gestor = current_user.perfil in ("responsable_igualdad", "rrhh_legal")
    return await svc.listar_represalias(UUID(current_user.id), es_gestor)
