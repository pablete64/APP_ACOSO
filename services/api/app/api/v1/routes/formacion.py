"""Router M3 — Formación y recursos."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.security import CurrentUser
from app.schemas.formacion import (
    CertificadoResponse,
    CompletarModuloRequest,
    CompletarModuloResponse,
    CursoDetalle,
    CursoResumen,
    RecursoNormativo,
)
from app.services.formacion_service import FormacionService

router = APIRouter(prefix="/formacion", tags=["formacion"])


def _svc(db: AsyncSession = Depends(get_db)) -> FormacionService:
    return FormacionService(db)


# ── Catálogo ──────────────────────────────────────────────────────────────────

@router.get("/cursos", response_model=list[CursoResumen])
async def listar_cursos(
    current_user: CurrentUser = Depends(get_current_user),
    svc: FormacionService = Depends(_svc),
) -> list[CursoResumen]:
    return await svc.listar_cursos(current_user.id, current_user.perfil)


@router.get("/cursos/{curso_id}", response_model=CursoDetalle)
async def detalle_curso(
    curso_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: FormacionService = Depends(_svc),
) -> CursoDetalle:
    curso = await svc.detalle_curso(curso_id, current_user.id)
    if not curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")
    return curso


# ── Inscripción ───────────────────────────────────────────────────────────────

@router.post("/cursos/{curso_id}/inscribir", status_code=204)
async def inscribir(
    curso_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: FormacionService = Depends(_svc),
) -> None:
    await svc.inscribir(curso_id, current_user.id)


# ── Módulos ───────────────────────────────────────────────────────────────────

@router.post(
    "/modulos/{modulo_id}/completar",
    response_model=CompletarModuloResponse,
    status_code=200,
)
async def completar_modulo(
    modulo_id: UUID,
    body: CompletarModuloRequest,
    current_user: CurrentUser = Depends(get_current_user),
    svc: FormacionService = Depends(_svc),
) -> CompletarModuloResponse:
    return await svc.completar_modulo(modulo_id, current_user.id, body)


# ── Certificados ──────────────────────────────────────────────────────────────

@router.get("/certificados/{cert_id}", response_model=CertificadoResponse)
async def detalle_certificado(
    cert_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: FormacionService = Depends(_svc),
) -> CertificadoResponse:
    cert = await svc.detalle_certificado(cert_id, current_user.id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    return cert


@router.get("/certificados/{cert_id}/pdf")
async def descargar_certificado_pdf(
    cert_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    svc: FormacionService = Depends(_svc),
) -> RedirectResponse:
    """Stub — en F9-pdf se reemplaza por URL firmada de MinIO."""
    cert = await svc.detalle_certificado(cert_id, current_user.id)
    if not cert:
        raise HTTPException(status_code=404, detail="Certificado no encontrado")
    # Redirect to static placeholder until PDF generation is wired up
    raise HTTPException(
        status_code=501,
        detail="Generación de PDF pendiente (F9-pdf)",
    )


# ── Biblioteca normativa ──────────────────────────────────────────────────────

@router.get("/biblioteca", response_model=list[RecursoNormativo])
async def biblioteca(
    tipo: str | None = Query(None, description="ley|reglamento|guia|jurisprudencia|protocolo"),
    current_user: CurrentUser = Depends(get_current_user),
    svc: FormacionService = Depends(_svc),
) -> list[RecursoNormativo]:
    return await svc.biblioteca(tipo)
