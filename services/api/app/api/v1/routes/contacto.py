"""Endpoints de M4 — Línea de contacto con personas designadas."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUserDep, TenantDBDep, require_permission
from app.schemas.contacto import (
    ActualizarCitaRequest,
    CitaResponse,
    ConversacionResumen,
    CrearCitaRequest,
    EnviarMensajeRequest,
    MensajeInternoResponse,
    PersonaDesignadaDetalle,
    PersonaDesignadaResumen,
)
from app.services.contacto_service import ContactoService

router = APIRouter(prefix="/contacto", tags=["M4 - Línea de contacto"])


def _svc(db: TenantDBDep) -> ContactoService:
    return ContactoService(db)


SvcDep = Annotated[ContactoService, Depends(_svc)]

# ── Directorio de personas designadas ────────────────────────────────────────


@router.get(
    "/personas-designadas",
    response_model=list[PersonaDesignadaResumen],
    summary="Directorio de personas designadas de la empresa",
)
async def listar_personas_designadas(svc: SvcDep) -> list[PersonaDesignadaResumen]:
    return await svc.listar_personas_designadas()


@router.get(
    "/personas-designadas/{persona_id}",
    response_model=PersonaDesignadaDetalle,
    summary="Detalle de una persona designada",
)
async def detalle_persona_designada(
    persona_id: UUID,
    svc: SvcDep,
) -> PersonaDesignadaDetalle:
    result = await svc.detalle_persona_designada(persona_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada")
    return result


# ── Mensajería cifrada E2E ────────────────────────────────────────────────────


@router.post(
    "/mensajes",
    response_model=MensajeInternoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar mensaje cifrado E2E a persona designada",
)
async def enviar_mensaje(
    data: EnviarMensajeRequest,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> MensajeInternoResponse:
    return await svc.enviar_mensaje(usuario.id, data)


@router.get(
    "/mensajes/conversaciones",
    response_model=list[ConversacionResumen],
    summary="Listado de conversaciones del usuario",
)
async def listar_conversaciones(
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> list[ConversacionResumen]:
    return await svc.listar_conversaciones(usuario.id)


@router.get(
    "/mensajes/con/{interlocutor_id}",
    response_model=list[MensajeInternoResponse],
    summary="Mensajes con un interlocutor concreto (marca como leídos)",
)
async def mensajes_con(
    interlocutor_id: UUID,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> list[MensajeInternoResponse]:
    return await svc.mensajes_con(usuario.id, interlocutor_id)


# ── Citas ─────────────────────────────────────────────────────────────────────


@router.post(
    "/citas",
    response_model=CitaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Solicitar cita con persona designada",
)
async def crear_cita(
    data: CrearCitaRequest,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> CitaResponse:
    return await svc.crear_cita(usuario.id, data)


@router.get(
    "/citas",
    response_model=list[CitaResponse],
    summary="Mis citas (trabajador) o agenda de igualdad",
)
async def listar_citas(
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> list[CitaResponse]:
    return await svc.listar_citas(usuario.id, usuario.perfil)


@router.patch(
    "/citas/{cita_id}",
    response_model=CitaResponse,
    dependencies=[Depends(require_permission("contacto:gestionar"))],
    summary="Confirmar o cancelar cita (persona designada / igualdad)",
)
async def actualizar_cita(
    cita_id: UUID,
    data: ActualizarCitaRequest,
    svc: SvcDep,
) -> CitaResponse:
    try:
        return await svc.actualizar_cita(cita_id, data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
