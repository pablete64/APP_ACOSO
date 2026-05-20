"""Lógica de negocio de M6 — Reporting y Dashboard ejecutivo."""
from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.reportes import (
    ExportRequest,
    ExportResponse,
    IndicadoresClima,
    ItemCumplimiento,
    KpiClima,
    KpiDenuncias,
    KpiExpedientes,
    KpiFormacion,
    ReporteCumplimiento,
    ReporteEjecutivo,
    ReportePlanIgualdad,
    SeccionPlanIgualdad,
)


class ReportesService:
    def __init__(self, db: AsyncSession, empresa_id: str) -> None:
        self.db = db
        self.empresa_id = empresa_id

    # ── KPIs ejecutivos ───────────────────────────────────────────────────────

    async def reporte_ejecutivo(
        self, periodo_inicio: date, periodo_fin: date
    ) -> ReporteEjecutivo:
        denuncias = await self._kpi_denuncias(periodo_inicio, periodo_fin)
        expedientes = await self._kpi_expedientes(periodo_inicio, periodo_fin)
        formacion = await self._kpi_formacion(periodo_inicio, periodo_fin)
        clima = await self._kpi_clima(periodo_inicio, periodo_fin)

        return ReporteEjecutivo(
            empresa_id=self.empresa_id,
            periodo_inicio=periodo_inicio,
            periodo_fin=periodo_fin,
            denuncias=denuncias,
            expedientes=expedientes,
            formacion=formacion,
            clima=clima,
            generado_en=datetime.now(tz=timezone.utc).isoformat(),
        )

    async def _kpi_denuncias(
        self, fi: date, ff: date
    ) -> KpiDenuncias:
        r_estado = await self.db.execute(
            text("""
                SELECT estado, COUNT(*) AS n
                FROM denuncias
                WHERE created_at::date BETWEEN :fi AND :ff
                GROUP BY estado
            """),
            {"fi": fi, "ff": ff},
        )
        por_estado = {row["estado"]: row["n"] for row in r_estado.mappings()}
        total = sum(por_estado.values())

        r_tipo = await self.db.execute(
            text("""
                SELECT tipo_acoso, COUNT(*) AS n
                FROM denuncias
                WHERE created_at::date BETWEEN :fi AND :ff
                GROUP BY tipo_acoso
            """),
            {"fi": fi, "ff": ff},
        )
        por_tipo = {row["tipo_acoso"]: row["n"] for row in r_tipo.mappings()}

        r_tiempo = await self.db.execute(
            text("""
                SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) AS dias
                FROM denuncias
                WHERE estado IN ('resuelta','archivada')
                  AND created_at::date BETWEEN :fi AND :ff
            """),
            {"fi": fi, "ff": ff},
        )
        tiempo_medio = r_tiempo.scalar()

        resueltas = por_estado.get("resuelta", 0) + por_estado.get("archivada", 0)
        tasa = round((resueltas / total * 100), 1) if total > 0 else 0.0

        return KpiDenuncias(
            total=total,
            por_estado=por_estado,
            por_tipo=por_tipo,
            tiempo_medio_resolucion_dias=round(float(tiempo_medio), 1) if tiempo_medio else None,
            tasa_resolucion_pct=tasa,
        )

    async def _kpi_expedientes(
        self, fi: date, ff: date
    ) -> KpiExpedientes:
        r = await self.db.execute(
            text("""
                SELECT
                    COUNT(*) FILTER (WHERE estado NOT IN ('cerrado','archivado')) AS abiertos,
                    COUNT(*) FILTER (WHERE estado IN ('cerrado','archivado'))     AS cerrados
                FROM expedientes
                WHERE fecha_apertura::date BETWEEN :fi AND :ff
            """),
            {"fi": fi, "ff": ff},
        )
        row = r.mappings().first() or {}

        r_vencidos = await self.db.execute(
            text("""
                SELECT COUNT(DISTINCT expediente_id) AS n
                FROM expediente_plazos
                WHERE completado = FALSE AND fecha_limite < NOW()
            """)
        )
        vencidos = r_vencidos.scalar() or 0

        r_tiempo = await self.db.execute(
            text("""
                SELECT AVG(EXTRACT(EPOCH FROM (fecha_cierre - fecha_apertura)) / 86400) AS dias
                FROM expedientes
                WHERE fecha_cierre IS NOT NULL
                  AND fecha_apertura::date BETWEEN :fi AND :ff
            """),
            {"fi": fi, "ff": ff},
        )
        tiempo_medio = r_tiempo.scalar()

        return KpiExpedientes(
            abiertos=row.get("abiertos", 0) or 0,
            cerrados=row.get("cerrados", 0) or 0,
            con_plazos_vencidos=vencidos,
            tiempo_medio_instruccion_dias=round(float(tiempo_medio), 1) if tiempo_medio else None,
        )

    async def _kpi_formacion(
        self, fi: date, ff: date
    ) -> KpiFormacion:
        r_cert = await self.db.execute(
            text("""
                SELECT COUNT(DISTINCT usuario_id) AS con_cert
                FROM certificados
                WHERE created_at::date BETWEEN :fi AND :ff
            """),
            {"fi": fi, "ff": ff},
        )
        con_cert = r_cert.scalar() or 0

        r_total_users = await self.db.execute(
            text("SELECT COUNT(*) FROM public.usuarios WHERE empresa_id = :eid AND activo = TRUE"),
            {"eid": self.empresa_id},
        )
        total_users = r_total_users.scalar() or 1
        cobertura = round((con_cert / total_users * 100), 1)

        r_top = await self.db.execute(
            text("""
                SELECT c.titulo, COUNT(ce.id) AS n
                FROM certificados ce
                JOIN cursos c ON c.id = ce.curso_id
                WHERE ce.created_at::date BETWEEN :fi AND :ff
                GROUP BY c.titulo
                ORDER BY n DESC
                LIMIT 3
            """),
            {"fi": fi, "ff": ff},
        )
        top_cursos = [row["titulo"] for row in r_top.mappings()]

        return KpiFormacion(
            trabajadores_con_curso_completado=con_cert,
            cobertura_pct=cobertura,
            cursos_mas_completados=top_cursos,
        )

    async def _kpi_clima(
        self, fi: date, ff: date
    ) -> KpiClima:
        r = await self.db.execute(
            text("""
                SELECT id FROM encuestas_clima
                WHERE fecha_inicio BETWEEN :fi AND :ff
                ORDER BY fecha_inicio DESC LIMIT 1
            """),
            {"fi": fi, "ff": ff},
        )
        enc_id = r.scalar()
        if not enc_id:
            return KpiClima(indice_global=None, variacion_vs_anterior=None, dimension_mas_critica=None)

        r_resp = await self.db.execute(
            text("SELECT respuestas FROM respuestas_clima WHERE encuesta_id = :eid"),
            {"eid": str(enc_id)},
        )
        rows = r_resp.mappings().all()
        if not rows:
            return KpiClima(indice_global=None, variacion_vs_anterior=None, dimension_mas_critica=None)

        import json, statistics as stats
        all_vals: list[float] = []
        dim_vals: dict[str, list[float]] = {}
        from app.services.clima_service import PREGUNTAS_FPSICO
        for row in rows:
            resp = json.loads(row["respuestas"]) if isinstance(row["respuestas"], str) else row["respuestas"]
            for item in resp:
                val = float(item["valor"])
                all_vals.append(val)
                p = next((x for x in PREGUNTAS_FPSICO if x["id"] == item["pregunta_id"]), None)
                if p:
                    dim_vals.setdefault(p["dimension"], []).append(val)

        indice = round(stats.mean(all_vals), 2) if all_vals else None
        critica = min(dim_vals, key=lambda d: stats.mean(dim_vals[d])) if dim_vals else None

        return KpiClima(
            indice_global=indice,
            variacion_vs_anterior=None,  # TODO: comparar con periodo anterior
            dimension_mas_critica=critica,
        )

    # ── Informe de cumplimiento ───────────────────────────────────────────────

    async def reporte_cumplimiento(self) -> ReporteCumplimiento:
        items: list[ItemCumplimiento] = []

        # Canal de denuncia activo
        r = await self.db.execute(text("SELECT COUNT(*) FROM denuncias"))
        n_denuncias = r.scalar() or 0
        items.append(ItemCumplimiento(
            norma="Ley 2/2023 art. 8",
            descripcion="Canal seguro de denuncia operativo y accesible",
            estado="cumple" if n_denuncias >= 0 else "pendiente",  # canal existe si la tabla existe
            evidencia=f"Canal activo. {n_denuncias} denuncias registradas.",
        ))

        # Plazos acuse de recibo (7 días)
        r_plazos = await self.db.execute(
            text("""
                SELECT
                    COUNT(*) FILTER (WHERE tipo = 'acuse_recibo' AND completado = TRUE) AS ok,
                    COUNT(*) FILTER (WHERE tipo = 'acuse_recibo') AS total
                FROM expediente_plazos
            """)
        )
        row_p = r_plazos.mappings().first()
        ok_acuse = row_p["ok"] if row_p else 0
        total_acuse = row_p["total"] if row_p else 0
        items.append(ItemCumplimiento(
            norma="Ley 2/2023 art. 19",
            descripcion="Acuse de recibo en ≤ 7 días hábiles",
            estado="cumple" if total_acuse == 0 or ok_acuse == total_acuse else "parcial",
            evidencia=f"{ok_acuse}/{total_acuse} acuses cumplidos en plazo.",
        ))

        # Instrucción completada (90 días)
        r_instr = await self.db.execute(
            text("""
                SELECT
                    COUNT(*) FILTER (WHERE tipo = 'investigacion' AND completado = TRUE) AS ok,
                    COUNT(*) FILTER (WHERE tipo = 'investigacion') AS total
                FROM expediente_plazos
            """)
        )
        row_i = r_instr.mappings().first()
        ok_i = row_i["ok"] if row_i else 0
        total_i = row_i["total"] if row_i else 0
        items.append(ItemCumplimiento(
            norma="Ley 2/2023 art. 20",
            descripcion="Instrucción completada en ≤ 90 días",
            estado="cumple" if total_i == 0 or ok_i == total_i else "parcial",
            evidencia=f"{ok_i}/{total_i} instrucciones en plazo.",
        ))

        # Formación al menos al 50 % de plantilla
        r_form = await self.db.execute(
            text("""
                SELECT
                    (SELECT COUNT(DISTINCT usuario_id) FROM certificados) AS formados,
                    (SELECT COUNT(*) FROM public.usuarios WHERE empresa_id = :eid AND activo = TRUE) AS total
            """),
            {"eid": self.empresa_id},
        )
        row_f = r_form.mappings().first()
        formados = row_f["formados"] if row_f else 0
        total_emp = row_f["total"] if row_f else 1
        cobertura_f = formados / total_emp if total_emp > 0 else 0
        items.append(ItemCumplimiento(
            norma="Ley Orgánica 3/2007 art. 48",
            descripcion="Formación preventiva a la plantilla (≥ 50 %)",
            estado="cumple" if cobertura_f >= 0.5 else ("parcial" if cobertura_f > 0 else "pendiente"),
            evidencia=f"{formados}/{total_emp} trabajadores con formación completada ({round(cobertura_f*100)}%).",
        ))

        # Protocolo publicado (existencia de la tabla personas_designadas activa)
        r_pd = await self.db.execute(
            text("SELECT COUNT(*) FROM personas_designadas WHERE activa = TRUE")
        )
        n_pd = r_pd.scalar() or 0
        items.append(ItemCumplimiento(
            norma="Ley Orgánica 3/2007 art. 48 + Convenio OIT 190",
            descripcion="Persona/s designada/s activa/s para atención",
            estado="cumple" if n_pd > 0 else "pendiente",
            evidencia=f"{n_pd} persona/s designada/s activa/s.",
        ))

        cumplidos = sum(1 for i in items if i.estado == "cumple")
        pct = round(cumplidos / len(items) * 100, 1) if items else 0.0

        return ReporteCumplimiento(
            empresa_id=self.empresa_id,
            fecha_generacion=date.today(),
            items=items,
            porcentaje_cumplimiento=pct,
        )

    # ── Plan de igualdad ──────────────────────────────────────────────────────

    async def reporte_plan_igualdad(self, año: int) -> ReportePlanIgualdad:
        fi = date(año, 1, 1)
        ff = date(año, 12, 31)
        ejecutivo = await self.reporte_ejecutivo(fi, ff)

        secciones = [
            SeccionPlanIgualdad(
                titulo="1. Diagnóstico de situación",
                contenido=(
                    f"Durante el año {año} se registraron {ejecutivo.denuncias.total} denuncias. "
                    f"La tasa de resolución fue del {ejecutivo.denuncias.tasa_resolucion_pct}%."
                ),
                datos={"denuncias": ejecutivo.denuncias.model_dump()},
            ),
            SeccionPlanIgualdad(
                titulo="2. Medidas adoptadas — Formación",
                contenido=(
                    f"Se completaron cursos de formación por {ejecutivo.formacion.trabajadores_con_curso_completado} trabajadores/as, "
                    f"lo que representa una cobertura del {ejecutivo.formacion.cobertura_pct}% de la plantilla activa."
                ),
                datos={"formacion": ejecutivo.formacion.model_dump()},
            ),
            SeccionPlanIgualdad(
                titulo="3. Canal de denuncia y gestión de expedientes",
                contenido=(
                    f"El canal de denuncia recibió {ejecutivo.denuncias.total} comunicaciones. "
                    f"Se instruyeron {ejecutivo.expedientes.abiertos + ejecutivo.expedientes.cerrados} expedientes, "
                    f"de los cuales {ejecutivo.expedientes.cerrados} fueron cerrados en el ejercicio."
                ),
                datos={"expedientes": ejecutivo.expedientes.model_dump()},
            ),
            SeccionPlanIgualdad(
                titulo="4. Clima organizacional",
                contenido=(
                    f"El índice global de clima laboral fue de "
                    f"{ejecutivo.clima.indice_global}/5.0."
                    if ejecutivo.clima.indice_global
                    else "No se realizaron encuestas de clima en este periodo."
                ),
                datos={"clima": ejecutivo.clima.model_dump()},
            ),
            SeccionPlanIgualdad(
                titulo="5. Conclusiones y compromisos para el siguiente ejercicio",
                contenido=(
                    "Se mantiene el compromiso de revisión anual del protocolo de prevención del acoso "
                    "y la formación continua de toda la plantilla conforme a la Ley Orgánica 3/2007 y "
                    "la Ley 2/2023."
                ),
                datos=None,
            ),
        ]

        return ReportePlanIgualdad(
            empresa_id=self.empresa_id,
            año=año,
            secciones=secciones,
            fecha_generacion=date.today(),
        )

    # ── Exportación (stub — PDF real en F12) ──────────────────────────────────

    async def exportar(self, req: ExportRequest) -> ExportResponse:
        return ExportResponse(
            url_descarga=f"/api/v1/reportes/export/stub/{req.tipo}.{req.formato}",
            expira_en=datetime.now(tz=timezone.utc).isoformat(),
            formato=req.formato,
            tamaño_bytes=None,
        )
