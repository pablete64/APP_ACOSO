"""Endpoints de M1 — Canal seguro de denuncia."""
from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import (
    CurrentUserDep,
    TenantDBDep,
    get_current_user_optional,
    require_permission,
)
from app.schemas.denuncia import (
    AsignarRequest,
    CrearDenunciaRequest,
    CrearDenunciaResponse,
    DenunciaDetalle,
    DownloadUrlResponse,
    ListaDenunciasResponse,
    NuevoMensajeRequest,
    SeguimientoResponse,
)
from app.services.denuncia_service import DenunciaService

router = APIRouter(prefix="/denuncias", tags=["M1 - Denuncias"])

# ── Helper ────────────────────────────────────────────────────────────────────


def _svc(db: TenantDBDep) -> DenunciaService:
    return DenunciaService(db)


# ── Crear denuncia (público — anónima o identificada) ─────────────────────────


@router.post(
    "",
    response_model=CrearDenunciaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una nueva denuncia (E2E cifrada)",
)
async def crear_denuncia(
    data: CrearDenunciaRequest,
    svc: Annotated[DenunciaService, Depends(_svc)],
    usuario: Annotated[object, Depends(get_current_user_optional)],
) -> CrearDenunciaResponse:
    usuario_id = getattr(usuario, "id", None) if usuario else None
    return await svc.crear(data, usuario_id=str(usuario_id) if usuario_id else None)


# ── Seguimiento público (solo por tracking_code) ──────────────────────────────


@router.get(
    "/seguimiento/{tracking_code}",
    response_model=SeguimientoResponse,
    summary="Consultar estado de una denuncia por tracking code",
)
async def seguimiento(
    tracking_code: str,
    svc: Annotated[DenunciaService, Depends(_svc)],
) -> SeguimientoResponse:
    result = await svc.seguimiento(tracking_code)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")
    return result


# ── Mensaje de seguimiento (anónimo o identificado) ───────────────────────────


@router.post(
    "/seguimiento/{tracking_code}/mensajes",
    status_code=status.HTTP_201_CREATED,
    summary="Añadir mensaje cifrado E2E al hilo de seguimiento",
)
async def agregar_mensaje(
    tracking_code: str,
    data: NuevoMensajeRequest,
    svc: Annotated[DenunciaService, Depends(_svc)],
    usuario: Annotated[object, Depends(get_current_user_optional)],
) -> dict:
    usuario_id = getattr(usuario, "id", None) if usuario else None
    # Si hay sesión activa → instructor/rrhh; si no → denunciante anónimo
    perfil = getattr(usuario, "perfil", None) if usuario else None
    remitente = "denunciante" if not perfil or perfil == "trabajador" else "instructor"
    try:
        await svc.agregar_mensaje(
            tracking_code,
            data,
            remitente=remitente,
            usuario_id=str(usuario_id) if usuario_id else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return {"ok": True}


# ── Listado para backoffice (Igualdad / RRHH) ─────────────────────────────────


@router.get(
    "",
    response_model=ListaDenunciasResponse,
    dependencies=[Depends(require_permission("denuncia:ver_todas"))],
    summary="Listar denuncias (backoffice paginado)",
)
async def listar_denuncias(
    svc: Annotated[DenunciaService, Depends(_svc)],
    estado: str | None = Query(None),
    tipo_acoso: str | None = Query(None),
    gravedad: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> ListaDenunciasResponse:
    result = await svc.listar(
        estado=estado,
        tipo_acoso=tipo_acoso,
        gravedad=gravedad,
        page=page,
        size=size,
    )
    return ListaDenunciasResponse(**result)


# ── Detalle para Igualdad / RRHH ──────────────────────────────────────────────


@router.get(
    "/{denuncia_id}",
    response_model=DenunciaDetalle,
    dependencies=[Depends(require_permission("denuncia:ver_detalle"))],
    summary="Detalle completo de una denuncia (ciphertext descifrado en cliente)",
)
async def detalle_denuncia(
    denuncia_id: UUID,
    svc: Annotated[DenunciaService, Depends(_svc)],
) -> DenunciaDetalle:
    result = await svc.detalle(str(denuncia_id))
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Denuncia no encontrada")
    return result


# ── Asignar instructor ────────────────────────────────────────────────────────


@router.post(
    "/{denuncia_id}/asignar",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("denuncia:asignar"))],
    summary="Asignar instructor a una denuncia",
)
async def asignar_instructor(
    denuncia_id: UUID,
    data: AsignarRequest,
    svc: Annotated[DenunciaService, Depends(_svc)],
    usuario: CurrentUserDep,
) -> None:
    await svc.asignar(str(denuncia_id), data, asignado_por=str(usuario.id))


# ── Registrar evidencia (metadata post-upload a storage) ─────────────────────


@router.post(
    "/{denuncia_id}/evidencias",
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("denuncia:ver_detalle"))],
    summary="Registrar metadata de evidencia ya subida al almacenamiento cifrado",
)
async def registrar_evidencia(
    denuncia_id: UUID,
    svc: Annotated[DenunciaService, Depends(_svc)],
) -> dict:
    # La evidencia se registra junto con la denuncia en el flujo normal (crear).
    # Este endpoint queda reservado para añadir evidencias posteriores al instructor.
    return {"ok": True, "mensaje": "Endpoint reservado para evidencias post-instrucción"}


# ── URL de descarga temporal (pre-signed) ─────────────────────────────────────


@router.get(
    "/{denuncia_id}/evidencias/{evidencia_id}/download-url",
    response_model=DownloadUrlResponse,
    dependencies=[Depends(require_permission("denuncia:ver_detalle"))],
    summary="Obtener URL de descarga temporal para evidencia cifrada",
)
async def download_url(
    denuncia_id: UUID,
    evidencia_id: UUID,
    svc: Annotated[DenunciaService, Depends(_svc)],
) -> DownloadUrlResponse:
    # TODO F5-storage: generar pre-signed URL desde MinIO/S3
    # Por ahora retorna stub para que el router esté registrado y testeado
    return DownloadUrlResponse(
        url=f"/storage/{denuncia_id}/evidencias/{evidencia_id}",
        expires_in=300,
    )
