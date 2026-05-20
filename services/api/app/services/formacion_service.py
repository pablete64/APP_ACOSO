"""Lógica de negocio de M3 — Formación y recursos."""
from __future__ import annotations

import uuid as _uuid
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.formacion import (
    CertificadoResponse,
    CompletarModuloRequest,
    CompletarModuloResponse,
    CursoDetalle,
    CursoResumen,
    ModuloResumen,
    RecursoNormativo,
)


class FormacionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Catálogo de cursos ────────────────────────────────────────────────────

    async def listar_cursos(self, usuario_id: UUID, perfil: str) -> list[CursoResumen]:
        result = await self.db.execute(
            text("""
                SELECT
                    c.id, c.titulo, c.descripcion,
                    c.perfiles_destino, c.duracion_total_minutos, c.num_modulos,
                    (p.id IS NOT NULL) AS inscrito,
                    COALESCE(p.progreso_pct, 0) AS progreso_pct,
                    p.certificado_id
                FROM cursos c
                LEFT JOIN progreso_formacion p
                    ON p.curso_id = c.id AND p.usuario_id = :uid
                WHERE c.activo = TRUE
                  AND (c.perfiles_destino @> ARRAY[:perfil]::text[]
                       OR c.perfiles_destino = '{}')
                ORDER BY c.orden ASC
            """),
            {"uid": str(usuario_id), "perfil": perfil},
        )
        return [CursoResumen(**dict(r)) for r in result.mappings()]

    async def detalle_curso(
        self, curso_id: UUID, usuario_id: UUID
    ) -> CursoDetalle | None:
        result = await self.db.execute(
            text("""
                SELECT
                    c.id, c.titulo, c.descripcion, c.objetivos,
                    c.perfiles_destino, c.duracion_total_minutos,
                    (p.id IS NOT NULL) AS inscrito,
                    COALESCE(p.progreso_pct, 0) AS progreso_pct,
                    p.certificado_id
                FROM cursos c
                LEFT JOIN progreso_formacion p
                    ON p.curso_id = c.id AND p.usuario_id = :uid
                WHERE c.id = :cid AND c.activo = TRUE
            """),
            {"uid": str(usuario_id), "cid": str(curso_id)},
        )
        row = result.mappings().first()
        if not row:
            return None

        modulos_r = await self.db.execute(
            text("""
                SELECT
                    m.id, m.titulo, m.orden, m.duracion_minutos, m.tipo,
                    (pm.id IS NOT NULL) AS completado,
                    pm.puntuacion
                FROM modulos_formacion m
                LEFT JOIN progreso_modulo pm
                    ON pm.modulo_id = m.id AND pm.usuario_id = :uid
                WHERE m.curso_id = :cid
                ORDER BY m.orden ASC
            """),
            {"uid": str(usuario_id), "cid": str(curso_id)},
        )
        modulos = [ModuloResumen(**dict(m)) for m in modulos_r.mappings()]

        data = dict(row)
        data["modulos"] = modulos
        data["num_modulos"] = len(modulos)
        return CursoDetalle(**data)

    # ── Inscripción ───────────────────────────────────────────────────────────

    async def inscribir(self, curso_id: UUID, usuario_id: UUID) -> None:
        await self.db.execute(
            text("""
                INSERT INTO progreso_formacion
                    (usuario_id, curso_id, progreso_pct)
                VALUES (:uid, :cid, 0)
                ON CONFLICT (usuario_id, curso_id) DO NOTHING
            """),
            {"uid": str(usuario_id), "cid": str(curso_id)},
        )
        await self.db.commit()

    # ── Completar módulo ──────────────────────────────────────────────────────

    async def completar_modulo(
        self,
        modulo_id: UUID,
        usuario_id: UUID,
        data: CompletarModuloRequest,
    ) -> CompletarModuloResponse:
        # Registrar progreso del módulo
        await self.db.execute(
            text("""
                INSERT INTO progreso_modulo (usuario_id, modulo_id, puntuacion)
                VALUES (:uid, :mid, :pts)
                ON CONFLICT (usuario_id, modulo_id)
                DO UPDATE SET puntuacion = EXCLUDED.puntuacion, updated_at = NOW()
            """),
            {"uid": str(usuario_id), "mid": str(modulo_id), "pts": data.puntuacion},
        )

        # Obtener el curso al que pertenece el módulo
        curso_r = await self.db.execute(
            text("SELECT curso_id FROM modulos_formacion WHERE id = :mid"),
            {"mid": str(modulo_id)},
        )
        curso_id = curso_r.scalar()

        # Recalcular progreso del curso
        total_r = await self.db.execute(
            text("SELECT COUNT(*) FROM modulos_formacion WHERE curso_id = :cid"),
            {"cid": curso_id},
        )
        completados_r = await self.db.execute(
            text("""
                SELECT COUNT(*) FROM progreso_modulo pm
                JOIN modulos_formacion m ON m.id = pm.modulo_id
                WHERE m.curso_id = :cid AND pm.usuario_id = :uid
            """),
            {"cid": curso_id, "uid": str(usuario_id)},
        )
        total = total_r.scalar() or 1
        completados = completados_r.scalar() or 0
        pct = int((completados / total) * 100)

        # Emitir certificado si el curso está al 100%
        certificado_id = None
        if pct == 100:
            certificado_id = await self._emitir_certificado(
                UUID(str(curso_id)), usuario_id
            )

        await self.db.execute(
            text("""
                UPDATE progreso_formacion
                SET progreso_pct = :pct, certificado_id = :cert, updated_at = NOW()
                WHERE curso_id = :cid AND usuario_id = :uid
            """),
            {
                "pct":  pct,
                "cert": str(certificado_id) if certificado_id else None,
                "cid":  curso_id,
                "uid":  str(usuario_id),
            },
        )
        await self.db.commit()
        return CompletarModuloResponse(
            modulo_id=modulo_id,
            completado=True,
            certificado_id=certificado_id,
        )

    async def _emitir_certificado(self, curso_id: UUID, usuario_id: UUID) -> UUID:
        cert_id = _uuid.uuid4()
        await self.db.execute(
            text("""
                INSERT INTO certificados (id, usuario_id, curso_id)
                VALUES (:id, :uid, :cid)
                ON CONFLICT (usuario_id, curso_id) DO NOTHING
                RETURNING id
            """),
            {"id": str(cert_id), "uid": str(usuario_id), "cid": str(curso_id)},
        )
        # Recuperar el existente si ya existía
        r = await self.db.execute(
            text("SELECT id FROM certificados WHERE usuario_id = :uid AND curso_id = :cid"),
            {"uid": str(usuario_id), "cid": str(curso_id)},
        )
        return UUID(r.scalar())

    # ── Certificados ──────────────────────────────────────────────────────────

    async def detalle_certificado(
        self, cert_id: UUID, usuario_id: UUID
    ) -> CertificadoResponse | None:
        result = await self.db.execute(
            text("""
                SELECT ce.id, ce.usuario_id, ce.curso_id,
                       c.titulo AS curso_titulo, ce.created_at AS emitido_en
                FROM certificados ce
                JOIN cursos c ON c.id = ce.curso_id
                WHERE ce.id = :id AND ce.usuario_id = :uid
            """),
            {"id": str(cert_id), "uid": str(usuario_id)},
        )
        row = result.mappings().first()
        if not row:
            return None
        data = dict(row)
        # URL temporal al PDF (generación real en F9-pdf)
        data["url_pdf"] = f"/api/v1/formacion/certificados/{cert_id}/pdf"
        return CertificadoResponse(**data)

    # ── Biblioteca normativa ──────────────────────────────────────────────────

    async def biblioteca(self, tipo: str | None = None) -> list[RecursoNormativo]:
        where = "WHERE activo = TRUE"
        params: dict = {}
        if tipo:
            where += " AND tipo = :tipo"
            params["tipo"] = tipo
        result = await self.db.execute(
            text(f"""
                SELECT id, titulo, tipo, organismo, url,
                       fecha::text, resumen, etiquetas
                FROM biblioteca_normativa
                {where}
                ORDER BY fecha DESC
            """),
            params,
        )
        return [RecursoNormativo(**dict(r)) for r in result.mappings()]
