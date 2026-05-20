"use client";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface KpiDenuncias {
  total: number;
  por_estado: Record<string, number>;
  por_tipo: Record<string, number>;
  tiempo_medio_resolucion_dias: number | null;
  tasa_resolucion_pct: number;
}
interface KpiFormacion {
  trabajadores_con_curso_completado: number;
  cobertura_pct: number;
  cursos_mas_completados: string[];
}
interface KpiExpedientes {
  abiertos: number;
  cerrados: number;
  con_plazos_vencidos: number;
  tiempo_medio_instruccion_dias: number | null;
}
interface KpiClima {
  indice_global: number | null;
  variacion_vs_anterior: number | null;
  dimension_mas_critica: string | null;
}
interface ReporteEjecutivo {
  empresa_id: string;
  periodo_inicio: string;
  periodo_fin: string;
  denuncias: KpiDenuncias;
  expedientes: KpiExpedientes;
  formacion: KpiFormacion;
  clima: KpiClima;
  generado_en: string;
}

const ESTADO_COLORES: Record<string, string> = {
  pendiente:      "bg-amber-500",
  en_revision:    "bg-blue-400",
  en_instruccion: "bg-blue-600",
  resuelta:       "bg-green-500",
  archivada:      "bg-gray-400",
  desestimada:    "bg-gray-300",
};

function KpiCard({
  label, value, sub, color = "text-gray-900 dark:text-white",
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ datos }: { datos: Record<string, number> }) {
  const total = Object.values(datos).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="space-y-2">
      {Object.entries(datos).map(([estado, n]) => (
        <div key={estado} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 w-28 truncate capitalize">{estado.replace("_", " ")}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-5 overflow-hidden">
            <div
              className={`h-5 rounded-full ${ESTADO_COLORES[estado] ?? "bg-brand-400"} transition-all duration-500`}
              style={{ width: `${(n / total) * 100}%` }}
              aria-label={`${estado}: ${n}`}
            />
          </div>
          <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-6 text-right">{n}</span>
        </div>
      ))}
    </div>
  );
}

const hoy = new Date();
const defaultInicio = new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10);
const defaultFin = hoy.toISOString().slice(0, 10);

export default function DashboardDireccionPage() {
  const [inicio, setInicio] = useState(defaultInicio);
  const [fin, setFin] = useState(defaultFin);

  const { data: reporte, isLoading, refetch } = useApiQuery(
    ["reporte-ejecutivo", inicio, fin],
    () =>
      apiClient
        .get<ReporteEjecutivo>(`/api/v1/reportes/ejecutivo?periodo_inicio=${inicio}&periodo_fin=${fin}`)
        .then((r) => r.data)
  );

  const exportarMutation = useApiMutation(
    (tipo: string) =>
      apiClient
        .post<{ url_descarga: string }>("/api/v1/reportes/export", {
          tipo,
          formato: "pdf",
          periodo_inicio: inicio,
          periodo_fin: fin,
        })
        .then((r) => r.data),
    {
      onSuccess: (data) => {
        window.open(data.url_descarga, "_blank");
      },
    }
  );

  return (
    <main id="main-content" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard ejecutivo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Solo datos agregados — sin acceso a información individual
          </p>
        </div>

        {/* Selector de periodo */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Fecha inicio"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Fecha fin"
          />
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {reporte && (
        <>
          {/* KPIs principales */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Denuncias recibidas"
              value={reporte.denuncias.total}
              sub={`${reporte.denuncias.tasa_resolucion_pct}% resueltas`}
            />
            <KpiCard
              label="Tiempo medio resolución"
              value={reporte.denuncias.tiempo_medio_resolucion_dias !== null
                ? `${reporte.denuncias.tiempo_medio_resolucion_dias}d`
                : "—"}
              sub="días hábiles"
            />
            <KpiCard
              label="Cobertura formativa"
              value={`${reporte.formacion.cobertura_pct}%`}
              sub={`${reporte.formacion.trabajadores_con_curso_completado} trabajadores/as`}
              color={reporte.formacion.cobertura_pct >= 50 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}
            />
            <KpiCard
              label="Índice de clima"
              value={reporte.clima.indice_global !== null ? `${reporte.clima.indice_global}/5` : "Sin datos"}
              sub={reporte.clima.dimension_mas_critica
                ? `Dimensión crítica: ${reporte.clima.dimension_mas_critica}`
                : undefined}
            />
          </div>

          {/* Segunda fila */}
          <div className="grid gap-4 sm:grid-cols-3">
            <KpiCard
              label="Expedientes abiertos"
              value={reporte.expedientes.abiertos}
              color={reporte.expedientes.con_plazos_vencidos > 0 ? "text-red-600 dark:text-red-400" : undefined}
              sub={reporte.expedientes.con_plazos_vencidos > 0
                ? `⚠ ${reporte.expedientes.con_plazos_vencidos} con plazos vencidos`
                : "Plazos al día"}
            />
            <KpiCard
              label="Expedientes cerrados"
              value={reporte.expedientes.cerrados}
              sub={reporte.expedientes.tiempo_medio_instruccion_dias !== null
                ? `Media ${reporte.expedientes.tiempo_medio_instruccion_dias}d`
                : undefined}
            />
            <KpiCard
              label="Cursos más completados"
              value={reporte.formacion.cursos_mas_completados[0] ?? "Sin datos"}
              sub={reporte.formacion.cursos_mas_completados.slice(1).join(" · ") || undefined}
            />
          </div>

          {/* Gráfico de denuncias por estado */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Denuncias por estado
              </h2>
              <BarChart datos={reporte.denuncias.por_estado} />
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Denuncias por tipo
              </h2>
              <BarChart datos={reporte.denuncias.por_tipo} />
            </div>
          </div>

          {/* Exportaciones */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
              Generar informes
            </h2>
            <div className="flex gap-3 flex-wrap">
              {[
                { tipo: "ejecutivo", label: "Informe ejecutivo PDF" },
                { tipo: "cumplimiento", label: "Cumplimiento normativo" },
                { tipo: "plan_igualdad", label: "Plan de igualdad anual" },
              ].map(({ tipo, label }) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => exportarMutation.mutate(tipo)}
                  disabled={exportarMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950 disabled:opacity-50 transition-colors"
                >
                  ↓ {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Los informes no incluyen datos identificativos. Solo estadísticas agregadas.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
