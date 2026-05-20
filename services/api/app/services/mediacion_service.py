"""Lógica de negocio de M8 — Mediación, pares de apoyo y represalias."""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.mediacion import (
    ActualizarMediacionRequest,
    MediacionResumen,
    ParApoyo,
    RegistrarParRequest,
    RegistrarRepresaliaRequest,
    RepresaliaResumen,
    SolicitarMediacionRequest,
)


class MediacionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Pares de apoyo ────────────────────────────────────────────────────────

    async def listar_pares(self) -> list[ParApoyo]:
        result = await self.db.execute(
            text("""
                SELECT
                    pa.id, pa.usuario_id,
                    u.nombre_visible,
                    u.departamento,
                    u.idiomas,
                    pa.formacion_completada,
                    pa.activo AS disponible
                FROM pares_apoyo pa
                JOIN public.usuarios u ON u.id = pa.usuario_id
                WHERE pa.activo = TRUE AND pa.formacion_completada = TRUE
                ORDER BY u.nombre_visible ASC
            """)
        )
        return [
            ParApoyo(
                id=row["id"],
                usuario_id=row["usuario_id"],
                nombre_visible=row["nombre_visible"] or "Compañero/a de apoyo",
                departamento=row["departamento"],
                idiomas=row["idiomas"] or ["es"],
                disponible=row["disponible"],
                formacion_completada=row["formacion_completada"],
            )
            for row in result.mappings()
        ]

    async def registrar_par(
        self, usuario_id: UUID, data: RegistrarParRequest
    ) -> UUID:
        # Verificar que el usuario tenga la formación M3 completada
        cert_r = await self.db.execute(
            text("""
                SELECT COUNT(*) FROM certificados
                WHERE usuario_id = :uid
            """),
            {"uid": str(usuario_id)},
        )
        n_certs = cert_r.scalar() or 0
        if n_certs == 0:
            raise ValueError("Se requiere completar al menos un curso de formación antes de ser par de apoyo.")

        r = await self.db.execute(
            text("""
                INSERT INTO pares_apoyo (usuario_id, formacion_completada)
                VALUES (:uid, TRUE)
                ON CONFLICT (usuario_id) DO UPDATE SET activo = TRUE
                RETURNING id
            """),
            {"uid": str(usuario_id)},
        )
        par_id = r.scalar()

        # Actualizar nombre_visible e idiomas en public.usuarios si se proporcionan
        await self.db.execute(
            text("""
                UPDATE public.usuarios
                SET nombre_visible = COALESCE(:nombre, nombre_visible)
                WHERE id = :uid
            """),
            {"nombre": data.nombre_visible, "uid": str(usuario_id)},
        )
        await self.db.commit()
        return UUID(str(par_id))

    async def dar_de_baja(self, usuario_id: UUID) -> None:
        await self.db.execute(
            text("UPDATE pares_apoyo SET activo = FALSE WHERE usuario_id = :uid"),
            {"uid": str(usuario_id)},
        )
        await self.db.commit()

    # ── Mediaciones ───────────────────────────────────────────────────────────

    async def solicitar_mediacion(
        self, usuario_id: UUID, data: SolicitarMediacionRequest
    ) -> UUID:
        r = await self.db.execute(
            text("""
                INSERT INTO mediaciones
                    (expediente_id, estado)
                VALUES (:eid, 'solicitada')
                RETURNING id
            """),
            {"eid": str(data.expediente_id) if data.expediente_id else None},
        )
        mediacion_id = r.scalar()
        await self.db.commit()
        return UUID(str(mediacion_id))

    async def listar_mediaciones(
        self, usuario_id: UUID, es_gestor: bool = False
    ) -> list[MediacionResumen]:
        if es_gestor:
            result = await self.db.execute(
                text("""
                    SELECT id, expediente_id, mediador_id, estado, created_at, updated_at
                    FROM mediaciones
                    ORDER BY created_at DESC
                """)
            )
        else:
            # Trabajador solo ve mediaciones de sus expedientes
            result = await self.db.execute(
                text("""
                    SELECT m.id, m.expediente_id, m.mediador_id, m.estado,
                           m.created_at, m.updated_at
                    FROM mediaciones m
                    LEFT JOIN expedientes e ON e.id = m.expediente_id
                    WHERE e.denuncia_id IN (
                        SELECT id FROM denuncias WHERE denunciante_id = :uid
                    )
                    ORDER BY m.created_at DESC
                """),
                {"uid": str(usuario_id)},
            )
        return [MediacionResumen(**dict(r)) for r in result.mappings()]

    async def detalle_mediacion(self, mediacion_id: UUID) -> MediacionResumen | None:
        r = await self.db.execute(
            text("""
                SELECT id, expediente_id, mediador_id, estado, created_at, updated_at
                FROM mediaciones WHERE id = :mid
            """),
            {"mid": str(mediacion_id)},
        )
        row = r.mappings().first()
        return MediacionResumen(**dict(row)) if row else None

    async def actualizar_mediacion(
        self, mediacion_id: UUID, data: ActualizarMediacionRequest
    ) -> MediacionResumen | None:
        await self.db.execute(
            text("""
                UPDATE mediaciones
                SET estado = :estado,
                    acuerdo_cifrado = COALESCE(:acuerdo, acuerdo_cifrado),
                    iv_b64 = COALESCE(:iv, iv_b64),
                    mediador_id = COALESCE(:mediador, mediador_id),
                    updated_at = NOW()
                WHERE id = :mid
            """),
            {
                "estado":   data.estado,
                "acuerdo":  data.acuerdo_ciphertext,
                "iv":       data.acuerdo_iv_b64,
                "mediador": str(data.mediador_id) if data.mediador_id else None,
                "mid":      str(mediacion_id),
            },
        )
        await self.db.commit()
        return await self.detalle_mediacion(mediacion_id)

    async def cancelar_mediacion(self, mediacion_id: UUID) -> None:
        """Opt-out en cualquier momento — derecho a retirada sin consecuencias."""
        await self.db.execute(
            text("UPDATE mediaciones SET estado = 'cancelada', updated_at = NOW() WHERE id = :mid"),
            {"mid": str(mediacion_id)},
        )
        await self.db.commit()

    # ── Represalias ───────────────────────────────────────────────────────────

    async def registrar_represalia(
        self, usuario_id: UUID, data: RegistrarRepresaliaRequest
    ) -> UUID:
        r = await self.db.execute(
            text("""
                INSERT INTO registros_represalia
                    (denunciante_id, denuncia_id, descripcion_cifrada, iv_b64, estado)
                VALUES (:uid, :did, :desc, :iv, 'registrada')
                RETURNING id
            """),
            {
                "uid":  str(usuario_id),
                "did":  str(data.denuncia_id) if data.denuncia_id else None,
                "desc": data.descripcion_ciphertext,
                "iv":   data.descripcion_iv_b64,
            },
        )
        represalia_id = r.scalar()
        await self.db.commit()
        return UUID(str(represalia_id))

    async def listar_represalias(
        self, usuario_id: UUID, es_gestor: bool = False
    ) -> list[RepresaliaResumen]:
        if es_gestor:
            result = await self.db.execute(
                text("""
                    SELECT id, denuncia_id, estado, created_at
                    FROM registros_represalia
                    ORDER BY created_at DESC
                """)
            )
        else:
            result = await self.db.execute(
                text("""
                    SELECT id, denuncia_id, estado, created_at
                    FROM registros_represalia
                    WHERE denunciante_id = :uid
                    ORDER BY created_at DESC
                """),
                {"uid": str(usuario_id)},
            )
        return [RepresaliaResumen(**dict(r)) for r in result.mappings()]
