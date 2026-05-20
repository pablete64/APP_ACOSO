"""Lógica de negocio de M1 — Canal de denuncia."""
from __future__ import annotations

import re
import secrets
import string
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.denuncia import (
    AsignarRequest,
    CrearDenunciaRequest,
    CrearDenunciaResponse,
    DenunciaDetalle,
    DenunciaResumen,
    EvidenciaInput,
    NuevoMensajeRequest,
    SeguimientoResponse,
)

# Alfabeto sin caracteres ambiguos (0/O, 1/I) — mismo que @safework/crypto
_TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
_TRACKING_LEN = 10


def _generate_tracking_code() -> str:
    return "".join(secrets.choice(_TRACKING_ALPHABET) for _ in range(_TRACKING_LEN))


class DenunciaService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Crear denuncia ────────────────────────────────────────────────────────

    async def crear(
        self,
        data: CrearDenunciaRequest,
        usuario_id: str | None,
    ) -> CrearDenunciaResponse:
        # Generar tracking_code único
        tracking_code = await self._unique_tracking_code()

        await self.db.execute(
            text("""
                INSERT INTO denuncias
                    (tracking_code, modalidad, tipo_acoso, estado,
                     ciphertext_b64, iv_b64, denunciante_id)
                VALUES
                    (:tc, :mod, :tipo, 'recibida',
                     :cipher, :iv, :uid)
            """),
            {
                "tc":     tracking_code,
                "mod":    data.modalidad,
                "tipo":   data.tipo_acoso,
                "cipher": data.ciphertext_b64,
                "iv":     data.iv_b64,
                "uid":    usuario_id if data.modalidad == "identificada" else None,
            },
        )

        # Registrar evidencias (ya cifradas en cliente)
        if data.evidencias:
            result = await self.db.execute(
                text("SELECT id FROM denuncias WHERE tracking_code = :tc"),
                {"tc": tracking_code},
            )
            denuncia_id = result.scalar()
            for ev in data.evidencias:
                await self._insertar_evidencia(denuncia_id, ev)

        # Audit log — solo acción, sin contenido
        await self.db.execute(
            text("""
                INSERT INTO audit_log (usuario_id, accion, recurso, resultado)
                VALUES (:uid, 'DENUNCIA_CREADA', 'denuncia', 'ok')
            """),
            {"uid": usuario_id},
        )

        await self.db.commit()

        return CrearDenunciaResponse(
            tracking_code=tracking_code,
            fecha_registro=datetime.now(timezone.utc),
        )

    async def _insertar_evidencia(self, denuncia_id, ev: EvidenciaInput) -> None:
        await self.db.execute(
            text("""
                INSERT INTO denuncia_evidencias
                    (denuncia_id, nombre_archivo, tipo_mime, tamano_bytes,
                     sha256_original, storage_key, iv_b64)
                VALUES
                    (:did, :nombre, :mime, :size, :hash, :key, :iv)
            """),
            {
                "did":    denuncia_id,
                "nombre": ev.nombre_archivo,
                "mime":   ev.tipo_mime,
                "size":   ev.tamano_bytes,
                "hash":   ev.sha256_original,
                "key":    ev.storage_key,
                "iv":     ev.iv_b64,
            },
        )

    async def _unique_tracking_code(self) -> str:
        for _ in range(10):
            code = _generate_tracking_code()
            result = await self.db.execute(
                text("SELECT 1 FROM denuncias WHERE tracking_code = :tc LIMIT 1"),
                {"tc": code},
            )
            if not result.scalar():
                return code
        raise RuntimeError("No se pudo generar tracking_code único")

    # ── Seguimiento público ───────────────────────────────────────────────────

    async def seguimiento(self, tracking_code: str) -> SeguimientoResponse | None:
        result = await self.db.execute(
            text("""
                SELECT id, tracking_code, estado, tipo_acoso, modalidad, updated_at
                FROM denuncias
                WHERE tracking_code = :tc
            """),
            {"tc": tracking_code.upper()},
        )
        row = result.mappings().first()
        if not row:
            return None

        msgs_result = await self.db.execute(
            text("""
                SELECT id, remitente, ciphertext_b64, iv_b64, leido, created_at
                FROM denuncia_mensajes
                WHERE denuncia_id = :did
                ORDER BY created_at ASC
            """),
            {"did": row["id"]},
        )
        mensajes = [dict(m) for m in msgs_result.mappings()]

        return SeguimientoResponse(
            tracking_code=row["tracking_code"],
            estado=row["estado"],
            tipo_acoso=row["tipo_acoso"],
            modalidad=row["modalidad"],
            ultima_actualizacion=row["updated_at"],
            mensajes_cifrados=mensajes,
        )

    # ── Mensaje de seguimiento ────────────────────────────────────────────────

    async def agregar_mensaje(
        self,
        tracking_code: str,
        data: NuevoMensajeRequest,
        remitente: str,
        usuario_id: str | None,
    ) -> None:
        result = await self.db.execute(
            text("SELECT id FROM denuncias WHERE tracking_code = :tc"),
            {"tc": tracking_code.upper()},
        )
        denuncia_id = result.scalar()
        if not denuncia_id:
            raise ValueError("Denuncia no encontrada")

        await self.db.execute(
            text("""
                INSERT INTO denuncia_mensajes
                    (denuncia_id, remitente, ciphertext_b64, iv_b64)
                VALUES (:did, :rem, :cipher, :iv)
            """),
            {
                "did":    denuncia_id,
                "rem":    remitente,
                "cipher": data.ciphertext_b64,
                "iv":     data.iv_b64,
            },
        )
        # Actualizar updated_at de la denuncia
        await self.db.execute(
            text("UPDATE denuncias SET updated_at = NOW() WHERE id = :id"),
            {"id": denuncia_id},
        )
        await self.db.commit()

    # ── Listado backoffice ────────────────────────────────────────────────────

    async def listar(
        self,
        estado: str | None = None,
        tipo_acoso: str | None = None,
        gravedad: str | None = None,
        page: int = 1,
        size: int = 20,
    ) -> dict:
        filters = ["1=1"]
        params: dict = {}
        if estado:
            filters.append("estado = :estado")
            params["estado"] = estado
        if tipo_acoso:
            filters.append("tipo_acoso = :tipo_acoso")
            params["tipo_acoso"] = tipo_acoso
        if gravedad:
            filters.append("gravedad_ia = :gravedad")
            params["gravedad"] = gravedad

        where = " AND ".join(filters)
        offset = (page - 1) * size

        count_r = await self.db.execute(
            text(f"SELECT COUNT(*) FROM denuncias WHERE {where}"), params
        )
        total = count_r.scalar()

        rows_r = await self.db.execute(
            text(f"""
                SELECT id, tracking_code, modalidad, tipo_acoso, estado,
                       gravedad_ia, created_at, updated_at
                FROM denuncias
                WHERE {where}
                ORDER BY created_at DESC
                LIMIT :size OFFSET :offset
            """),
            {**params, "size": size, "offset": offset},
        )
        items = [dict(r) for r in rows_r.mappings()]

        return {"items": items, "total": total, "page": page, "size": size}

    # ── Detalle backoffice ────────────────────────────────────────────────────

    async def detalle(self, denuncia_id: str) -> DenunciaDetalle | None:
        result = await self.db.execute(
            text("""
                SELECT id, tracking_code, modalidad, tipo_acoso, estado,
                       gravedad_ia, evaluacion_ia, ciphertext_b64, iv_b64,
                       created_at, updated_at
                FROM denuncias WHERE id = :id
            """),
            {"id": denuncia_id},
        )
        row = result.mappings().first()
        if not row:
            return None

        evs_r = await self.db.execute(
            text("""
                SELECT id, nombre_archivo, tipo_mime, tamano_bytes, sha256_original, iv_b64
                FROM denuncia_evidencias WHERE denuncia_id = :did
            """),
            {"did": row["id"]},
        )
        msgs_r = await self.db.execute(
            text("""
                SELECT id, remitente, ciphertext_b64, iv_b64, leido, created_at
                FROM denuncia_mensajes WHERE denuncia_id = :did ORDER BY created_at
            """),
            {"did": row["id"]},
        )

        return DenunciaDetalle(
            **dict(row),
            evidencias=[dict(e) for e in evs_r.mappings()],
            mensajes=[dict(m) for m in msgs_r.mappings()],
        )

    # ── Asignar instructor ────────────────────────────────────────────────────

    async def asignar(self, denuncia_id: str, data: AsignarRequest, asignado_por: str) -> None:
        await self.db.execute(
            text("""
                UPDATE denuncias
                SET instructor_id = :iid, estado = 'en_revision', updated_at = NOW()
                WHERE id = :did
            """),
            {"iid": str(data.instructor_id), "did": denuncia_id},
        )
        await self.db.execute(
            text("""
                INSERT INTO audit_log (usuario_id, accion, recurso, recurso_id, resultado)
                VALUES (:uid, 'DENUNCIA_ASIGNADA', 'denuncia', :did, 'ok')
            """),
            {"uid": asignado_por, "did": denuncia_id},
        )
        await self.db.commit()
