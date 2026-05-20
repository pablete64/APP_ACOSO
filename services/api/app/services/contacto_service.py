"""Lógica de negocio de M4 — Línea de contacto."""
from __future__ import annotations

import secrets
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

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


class ContactoService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Personas designadas ───────────────────────────────────────────────────

    async def listar_personas_designadas(self) -> list[PersonaDesignadaResumen]:
        result = await self.db.execute(
            text("""
                SELECT id, nombre, rol, email_contacto, idiomas,
                       disponible, avatar_url
                FROM personas_designadas
                WHERE activo = TRUE
                ORDER BY nombre ASC
            """)
        )
        return [PersonaDesignadaResumen(**dict(r)) for r in result.mappings()]

    async def detalle_persona_designada(self, persona_id: UUID) -> PersonaDesignadaDetalle | None:
        result = await self.db.execute(
            text("""
                SELECT id, nombre, rol, email_contacto, idiomas,
                       disponible, avatar_url,
                       biografia_corta, horario, modalidades
                FROM personas_designadas
                WHERE id = :id AND activo = TRUE
            """),
            {"id": str(persona_id)},
        )
        row = result.mappings().first()
        if not row:
            return None
        data = dict(row)
        data.setdefault("idiomas", [])
        data.setdefault("modalidades", [])
        return PersonaDesignadaDetalle(**data)

    # ── Mensajes internos ─────────────────────────────────────────────────────

    async def enviar_mensaje(
        self,
        remitente_id: UUID,
        data: EnviarMensajeRequest,
    ) -> MensajeInternoResponse:
        result = await self.db.execute(
            text("""
                INSERT INTO mensajes_internos
                    (remitente_id, destinatario_id, ciphertext_b64, iv_b64)
                VALUES (:rem, :dest, :cipher, :iv)
                RETURNING id, remitente_id, destinatario_id,
                          ciphertext_b64, iv_b64, leido, created_at
            """),
            {
                "rem":    str(remitente_id),
                "dest":   str(data.destinatario_id),
                "cipher": data.ciphertext_b64,
                "iv":     data.iv_b64,
            },
        )
        row = result.mappings().first()
        await self.db.commit()
        return MensajeInternoResponse(**dict(row))

    async def listar_conversaciones(
        self, usuario_id: UUID
    ) -> list[ConversacionResumen]:
        result = await self.db.execute(
            text("""
                SELECT
                    CASE
                        WHEN m.remitente_id = :uid THEN m.destinatario_id
                        ELSE m.remitente_id
                    END AS interlocutor_id,
                    u.nombre AS interlocutor_nombre,
                    MAX(m.created_at) AS ultimo_mensaje_at,
                    COUNT(*) FILTER (
                        WHERE m.destinatario_id = :uid AND m.leido = FALSE
                    ) AS no_leidos
                FROM mensajes_internos m
                JOIN usuarios u ON u.id = CASE
                    WHEN m.remitente_id = :uid THEN m.destinatario_id
                    ELSE m.remitente_id
                END
                WHERE m.remitente_id = :uid OR m.destinatario_id = :uid
                GROUP BY interlocutor_id, u.nombre
                ORDER BY ultimo_mensaje_at DESC
            """),
            {"uid": str(usuario_id)},
        )
        return [ConversacionResumen(**dict(r)) for r in result.mappings()]

    async def mensajes_con(
        self,
        usuario_id: UUID,
        interlocutor_id: UUID,
    ) -> list[MensajeInternoResponse]:
        result = await self.db.execute(
            text("""
                SELECT id, remitente_id, destinatario_id,
                       ciphertext_b64, iv_b64, leido, created_at
                FROM mensajes_internos
                WHERE (remitente_id = :uid AND destinatario_id = :iid)
                   OR (remitente_id = :iid AND destinatario_id = :uid)
                ORDER BY created_at ASC
            """),
            {"uid": str(usuario_id), "iid": str(interlocutor_id)},
        )
        msgs = [MensajeInternoResponse(**dict(r)) for r in result.mappings()]

        # Marcar como leídos los no leídos del interlocutor
        await self.db.execute(
            text("""
                UPDATE mensajes_internos
                SET leido = TRUE
                WHERE destinatario_id = :uid
                  AND remitente_id    = :iid
                  AND leido = FALSE
            """),
            {"uid": str(usuario_id), "iid": str(interlocutor_id)},
        )
        await self.db.commit()
        return msgs

    # ── Citas ─────────────────────────────────────────────────────────────────

    async def crear_cita(
        self, solicitante_id: UUID, data: CrearCitaRequest
    ) -> CitaResponse:
        result = await self.db.execute(
            text("""
                INSERT INTO citas
                    (solicitante_id, persona_designada_id, modalidad,
                     fecha_propuesta, motivo_ciphertext, motivo_iv_b64, estado)
                VALUES
                    (:sol, :pd, :mod, :fecha, :cipher, :iv, 'pendiente')
                RETURNING id, solicitante_id, persona_designada_id, modalidad,
                          fecha_propuesta, fecha_confirmada, estado,
                          motivo_ciphertext, motivo_iv_b64,
                          enlace_videollamada, created_at, updated_at
            """),
            {
                "sol":    str(solicitante_id),
                "pd":     str(data.persona_designada_id),
                "mod":    data.modalidad,
                "fecha":  data.fecha_propuesta,
                "cipher": data.motivo_ciphertext,
                "iv":     data.motivo_iv_b64,
            },
        )
        row = result.mappings().first()
        await self.db.commit()
        return CitaResponse(**dict(row))

    async def listar_citas(
        self, usuario_id: UUID, perfil: str
    ) -> list[CitaResponse]:
        # Trabajador ve sus citas; Igualdad ve todas las de sus designadas
        if perfil == "trabajador":
            where = "solicitante_id = :uid"
        else:
            where = "persona_designada_id IN (SELECT id FROM personas_designadas WHERE activo = TRUE)"

        result = await self.db.execute(
            text(f"""
                SELECT id, solicitante_id, persona_designada_id, modalidad,
                       fecha_propuesta, fecha_confirmada, estado,
                       motivo_ciphertext, motivo_iv_b64,
                       enlace_videollamada, created_at, updated_at
                FROM citas
                WHERE {where}
                ORDER BY fecha_propuesta DESC
            """),
            {"uid": str(usuario_id)},
        )
        return [CitaResponse(**dict(r)) for r in result.mappings()]

    async def actualizar_cita(
        self, cita_id: UUID, data: ActualizarCitaRequest
    ) -> CitaResponse:
        enlace = None
        if data.estado == "confirmada" and not data.enlace_videollamada:
            # Genera token único para sala Jitsi efímera
            enlace = f"https://meet.safework.ai/cita-{secrets.token_urlsafe(16)}"
        else:
            enlace = data.enlace_videollamada

        result = await self.db.execute(
            text("""
                UPDATE citas
                SET estado = :estado,
                    fecha_confirmada = :fecha,
                    enlace_videollamada = :enlace,
                    updated_at = NOW()
                WHERE id = :id
                RETURNING id, solicitante_id, persona_designada_id, modalidad,
                          fecha_propuesta, fecha_confirmada, estado,
                          motivo_ciphertext, motivo_iv_b64,
                          enlace_videollamada, created_at, updated_at
            """),
            {
                "id":     str(cita_id),
                "estado": data.estado,
                "fecha":  data.fecha_confirmada,
                "enlace": enlace,
            },
        )
        row = result.mappings().first()
        if not row:
            raise ValueError("Cita no encontrada")
        await self.db.commit()
        return CitaResponse(**dict(row))
