"""Lógica de negocio de M7 — Termómetro de clima laboral."""
from __future__ import annotations

import math
import statistics
from datetime import date
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.clima import (
    CrearEncuestaRequest,
    EnviarRespuestasRequest,
    EncuestaActiva,
    IndicadorDimension,
    IndicadoresClima,
    PreguntaClima,
)

# Umbral mínimo RGPD k-anonimato — no se muestran resultados con < N respuestas
K_ANONIMATO_MIN = 5

# Preguntas estándar FPSICO/INSST (una por dimensión para la versión "pulso")
PREGUNTAS_FPSICO: list[dict] = [
    {
        "id": "aut_1",
        "texto": "Puedo decidir cómo organizar mi trabajo diario sin necesitar aprobación.",
        "dimension": "autonomia",
        "escala": "likert5",
    },
    {
        "id": "car_1",
        "texto": "Mi carga de trabajo es razonable y puedo terminar mis tareas en el tiempo disponible.",
        "dimension": "carga_trabajo",
        "escala": "likert5",
    },
    {
        "id": "cog_1",
        "texto": "Mi trabajo requiere un nivel de concentración que encuentro manejable.",
        "dimension": "demandas_cognitivas",
        "escala": "likert5",
    },
    {
        "id": "var_1",
        "texto": "Mis tareas son variadas e interesantes, no monótonas.",
        "dimension": "variedad_contenido",
        "escala": "likert5",
    },
    {
        "id": "par_1",
        "texto": "Puedo participar en las decisiones que afectan a mi trabajo.",
        "dimension": "participacion",
        "escala": "likert5",
    },
    {
        "id": "int_1",
        "texto": "Siento que mi trabajo y mi esfuerzo son reconocidos y compensados justamente.",
        "dimension": "interes_compensacion",
        "escala": "likert5",
    },
    {
        "id": "rol_1",
        "texto": "Tengo claro qué se espera de mí en mi puesto de trabajo.",
        "dimension": "desempeño_rol",
        "escala": "likert5",
    },
    {
        "id": "rel_1",
        "texto": "Las relaciones con mis compañeros y superiores son respetuosas y de apoyo mutuo.",
        "dimension": "relaciones_apoyo",
        "escala": "likert5",
    },
]


def _nivel_riesgo(media: float, escala_max: int = 5) -> str:
    """Clasifica el riesgo basado en la media normalizada (mayor = mejor)."""
    pct = media / escala_max
    if pct >= 0.65:
        return "bajo"
    if pct >= 0.40:
        return "medio"
    return "alto"


class ClimaService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Encuestas ─────────────────────────────────────────────────────────────

    async def crear_encuesta(self, data: CrearEncuestaRequest) -> UUID:
        r = await self.db.execute(
            text("""
                INSERT INTO encuestas_clima
                    (titulo, descripcion, activa, fecha_inicio, fecha_fin, dimensiones)
                VALUES (:titulo, :desc, TRUE, :fi, :ff, :dims::jsonb)
                RETURNING id
            """),
            {
                "titulo": data.titulo,
                "desc": data.descripcion,
                "fi": data.fecha_inicio,
                "ff": data.fecha_fin,
                "dims": str(data.dimensiones).replace("'", '"'),
            },
        )
        encuesta_id = r.scalar()
        await self.db.commit()
        return UUID(str(encuesta_id))

    async def encuestas_activas(self) -> list[EncuestaActiva]:
        result = await self.db.execute(
            text("""
                SELECT id, titulo, descripcion, fecha_inicio, fecha_fin, dimensiones
                FROM encuestas_clima
                WHERE activa = TRUE AND fecha_fin >= CURRENT_DATE
                ORDER BY fecha_inicio DESC
            """)
        )
        rows = result.mappings().all()
        encuestas = []
        for row in rows:
            import json
            dims = json.loads(row["dimensiones"]) if isinstance(row["dimensiones"], str) else row["dimensiones"]
            preguntas = [
                PreguntaClima(**p)
                for p in PREGUNTAS_FPSICO
                if p["dimension"] in dims
            ]
            encuestas.append(
                EncuestaActiva(
                    id=row["id"],
                    titulo=row["titulo"],
                    descripcion=row["descripcion"],
                    fecha_inicio=row["fecha_inicio"],
                    fecha_fin=row["fecha_fin"],
                    preguntas=preguntas,
                )
            )
        return encuestas

    # ── Respuestas (sin usuario_id — anonimato total) ─────────────────────────

    async def registrar_respuestas(self, data: EnviarRespuestasRequest) -> None:
        import json
        await self.db.execute(
            text("""
                INSERT INTO respuestas_clima
                    (encuesta_id, departamento, respuestas, fecha)
                VALUES (:eid, :dept, :resp::jsonb, CURRENT_DATE)
            """),
            {
                "eid": str(data.encuesta_id),
                "dept": data.departamento,
                "resp": json.dumps([r.model_dump() for r in data.respuestas]),
            },
        )
        await self.db.commit()

    # ── Indicadores agregados ─────────────────────────────────────────────────

    async def indicadores(self, encuesta_id: UUID) -> IndicadoresClima | None:
        enc_r = await self.db.execute(
            text("""
                SELECT id, titulo, fecha_inicio, fecha_fin, dimensiones
                FROM encuestas_clima WHERE id = :eid
            """),
            {"eid": str(encuesta_id)},
        )
        enc = enc_r.mappings().first()
        if not enc:
            return None

        resp_r = await self.db.execute(
            text("""
                SELECT respuestas
                FROM respuestas_clima
                WHERE encuesta_id = :eid
            """),
            {"eid": str(encuesta_id)},
        )
        rows = resp_r.mappings().all()
        n_total = len(rows)

        suficiente = n_total >= K_ANONIMATO_MIN

        if not suficiente:
            return IndicadoresClima(
                encuesta_id=encuesta_id,
                titulo=enc["titulo"],
                fecha_inicio=enc["fecha_inicio"],
                fecha_fin=enc["fecha_fin"],
                n_total_respuestas=n_total,
                indice_global=0.0,
                suficiente_anonimato=False,
                dimensiones=[],
                alertas=[f"Se necesitan al menos {K_ANONIMATO_MIN} respuestas para mostrar resultados."],
            )

        # Agrupar valores por dimension
        import json
        dim_valores: dict[str, list[float]] = {}
        for row in rows:
            resp = json.loads(row["respuestas"]) if isinstance(row["respuestas"], str) else row["respuestas"]
            for item in resp:
                pid = item["pregunta_id"]
                val = float(item["valor"])
                pregunta = next((p for p in PREGUNTAS_FPSICO if p["id"] == pid), None)
                if pregunta:
                    dim = pregunta["dimension"]
                    dim_valores.setdefault(dim, []).append(val)

        import json as _json
        dims_enc = _json.loads(enc["dimensiones"]) if isinstance(enc["dimensiones"], str) else enc["dimensiones"]

        # Calcular indicadores por dimension
        indicadores_dim: list[IndicadorDimension] = []
        alertas: list[str] = []
        medias: list[float] = []

        for dim in dims_enc:
            vals = dim_valores.get(dim, [])
            if not vals:
                continue
            media = statistics.mean(vals)
            mediana = statistics.median(vals)
            desv = statistics.stdev(vals) if len(vals) > 1 else 0.0
            nivel = _nivel_riesgo(media)
            medias.append(media)

            if nivel == "alto":
                alertas.append(f"{dim} en nivel de riesgo alto")
            elif nivel == "medio":
                alertas.append(f"{dim} en nivel de riesgo medio")

            indicadores_dim.append(IndicadorDimension(
                dimension=dim,  # type: ignore[arg-type]
                media=round(media, 2),
                mediana=round(mediana, 2),
                desviacion=round(desv, 2),
                n_respuestas=len(vals),
                nivel_riesgo=nivel,
                variacion_pct=None,  # TODO: comparar con encuesta anterior
            ))

        indice_global = round(statistics.mean(medias), 2) if medias else 0.0

        return IndicadoresClima(
            encuesta_id=encuesta_id,
            titulo=enc["titulo"],
            fecha_inicio=enc["fecha_inicio"],
            fecha_fin=enc["fecha_fin"],
            n_total_respuestas=n_total,
            indice_global=indice_global,
            suficiente_anonimato=True,
            dimensiones=indicadores_dim,
            alertas=alertas,
        )
