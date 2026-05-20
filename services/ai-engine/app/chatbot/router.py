"""Endpoints de M2 — Asistente IA."""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.chatbot.schemas import (
    CrearSesionRequest,
    CrearSesionResponse,
    DerivarRequest,
    EvaluacionResponse,
    HistorialResponse,
    MensajeRequest,
    MensajeResponse,
)
from app.chatbot.service import ChatService
from app.core.redis import get_redis
from app.core.security import CurrentUser, CurrentUserDep

router = APIRouter()


async def _svc(request: Request) -> ChatService:
    redis = await get_redis()
    return ChatService(redis)


SvcDep = Annotated[ChatService, Depends(_svc)]


# ── POST /chat/session ────────────────────────────────────────────────────────

@router.post(
    "/session",
    response_model=CrearSesionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear nueva sesión de chat con el asistente",
)
async def crear_sesion(
    data: CrearSesionRequest,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> CrearSesionResponse:
    return await svc.crear_sesion(usuario.id, data.modo)


# ── POST /chat/{session_id}/message (streaming SSE) ──────────────────────────

@router.post(
    "/{session_id}/message",
    summary="Enviar mensaje — streaming SSE token a token",
)
async def enviar_mensaje_stream(
    session_id: uuid.UUID,
    data: MensajeRequest,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> StreamingResponse:
    async def _generator():
        try:
            async for chunk in svc.stream_mensaje(session_id, usuario.id, data.contenido):
                yield chunk
        except PermissionError:
            yield "data: {\"error\": \"forbidden\"}\n\n"
        except ValueError:
            yield "data: {\"error\": \"session_not_found\"}\n\n"
        except RuntimeError as e:
            if "Límite" in str(e):
                yield "data: {\"error\": \"rate_limit\"}\n\n"
            else:
                yield "data: {\"error\": \"internal\"}\n\n"

    return StreamingResponse(
        _generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Nginx: deshabilitar buffer para SSE
        },
    )


# ── POST /chat/{session_id}/message-sync (sin streaming, útil para tests) ────

@router.post(
    "/{session_id}/message-sync",
    response_model=MensajeResponse,
    summary="Enviar mensaje — respuesta completa (sin streaming)",
)
async def enviar_mensaje_sync(
    session_id: uuid.UUID,
    data: MensajeRequest,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> MensajeResponse:
    try:
        return await svc.enviar_mensaje(session_id, usuario.id, data.contenido)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
    except RuntimeError as e:
        if "Límite" in str(e):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ── GET /chat/{session_id} ────────────────────────────────────────────────────

@router.get(
    "/{session_id}",
    response_model=HistorialResponse,
    summary="Obtener historial de la sesión",
)
async def historial(
    session_id: uuid.UUID,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> HistorialResponse:
    try:
        return await svc.historial(session_id, usuario.id)
    except (PermissionError, ValueError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")


# ── POST /chat/{session_id}/evaluacion ───────────────────────────────────────

@router.post(
    "/{session_id}/evaluacion",
    response_model=EvaluacionResponse,
    summary="Generar evaluación estructurada de la situación",
)
async def evaluacion(
    session_id: uuid.UUID,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> EvaluacionResponse:
    try:
        return await svc.evaluacion(session_id, usuario.id)
    except PermissionError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sesión no encontrada")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al generar evaluación: {e}",
        )


# ── POST /chat/{session_id}/derivar ──────────────────────────────────────────

@router.post(
    "/{session_id}/derivar",
    status_code=status.HTTP_200_OK,
    summary="Derivar la conversación a canal de denuncia, cita o Inspección",
)
async def derivar(
    session_id: uuid.UUID,
    data: DerivarRequest,
    usuario: CurrentUserDep,
) -> dict:
    # La derivación real la gestiona el servicio api
    # Este endpoint devuelve las instrucciones y la URL de destino
    destinos = {
        "denuncia":    "/denuncia",
        "cita":        "/contacto",
        "inspeccion":  "https://www.mites.gob.es/itss/web/Trabajadores/Denuncias/",
    }
    return {
        "destino": data.destino,
        "url": destinos.get(data.destino, "/"),
        "mensaje": (
            "Te vamos a acompañar en el siguiente paso. "
            "Recuerda que puedes volver al asistente en cualquier momento."
        ),
    }


# ── DELETE /chat/{session_id} ─────────────────────────────────────────────────

@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Borrar conversación (derecho a la supresión)",
)
async def borrar_sesion(
    session_id: uuid.UUID,
    svc: SvcDep,
    usuario: CurrentUserDep,
) -> None:
    try:
        await svc.borrar_sesion(session_id, usuario.id)
    except (PermissionError, ValueError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
