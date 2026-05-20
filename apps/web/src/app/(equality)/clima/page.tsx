"use client";
import { useState } from "react";
import { useApiQuery } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface EncuestaActiva {
  id: string;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
}

interface IndicadorDimension {
  dimension: string;
  media: number;
  mediana: number;
  desviacion: number;
  n_respuestas: number;
  nivel_riesgo: "bajo" | "medio" | "alto";
  variacion_pct: number | null;
}

interface IndicadoresClima {
  encuesta_id: string;
  titulo: string;
  fecha_inicio: string;
  fecha_fin: string;
  n_total_respuestas: number;
  indice_global: number;
  suficiente_anonimato: boolean;
  dimensiones: IndicadorDimension[];
  alertas: string[];
}

const RIESGO_COLOR: Record<string, string> = {
  bajo:  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  medio: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  alto:  "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const DIM_NOMBRE: Record<string, string> = {
  autonomia:            "Autonomía",
  carga_trabajo:        "Carga de trabajo",
  demandas_cognitivas:  "Demandas cognitivas",
  variedad_contenido:   "Variedad del contenido",
  participacion:        "Participación",
  interes_compensacion: "Interés y compensación",
  desempeño_rol:        "Desempeño del rol",
  relaciones_apoyo:     "Relaciones y apoyo",
};

function MediaBar({ valor, max = 5 }: { valor: number; max?: number }) {
  const pct = (valor / max) * 100;
  const color = pct >= 65 ? "bg-green-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-600 dark:text-gray-400 w-8 text-right">
        {valor.toFixed(1)}
      </span>
    </div>
  );
}

export default function ClimaIgualdadPage() {
  const [encuestaSeleccionada, setEncuestaSeleccionada] = useState<string | null>(null);

  const { data: encuestas, isLoading: cargandoEnc } = useApiQuery(
    ["clima-activas"],
    () => apiClient.get<EncuestaActiva[]>("/api/v1/clima/encuestas/activas").then((r) => r.data),
    {
      onSuccess: (data) => {
        if (data.length > 0 && !encuestaSeleccionada) {
          setEncuestaSeleccionada(data[0].id);
        }
      },
    }
  );

  const { data: indicadores, isLoading: cargandoInd } = useApiQuery(
    ["clima-indicadores", encuestaSeleccionada],
    () =>
      apiClient
        .get<IndicadoresClima>(`/api/v1/clima/indicadores/${encuestaSeleccionada}`)
        .then((r) => r.data),
    { enabled: !!encuestaSeleccionada }
  );

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Termómetro de clima</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Resultados agregados — FPSICO/INSST · k-anonimato protegido
        </p>
      </div>

      {/* Selector de encuesta */}
      {(encuestas?.length ?? 0) > 1 && (
        <div className="flex gap-2 flex-wrap">
          {encuestas!.map((e) => (
            <button
              key={e.id}
              onClick={() => setEncuestaSeleccionada(e.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                encuestaSeleccionada === e.id
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400"
              }`}
            >
              {e.titulo}
            </button>
          ))}
        </div>
      )}

      {(cargandoEnc || cargandoInd) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {indicadores && (
        <>
          {/* Alertas */}
          {indicadores.alertas.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4 space-y-1">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                ⚠ Alertas de riesgo
              </p>
              {indicadores.alertas.map((a, i) => (
                <p key={i} className="text-xs text-red-600 dark:text-red-400">• {a}</p>
              ))}
            </div>
          )}

          {/* Sin anonimato suficiente */}
          {!indicadores.suficiente_anonimato && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                🔒 {indicadores.alertas[0] ?? "Respuestas insuficientes para mostrar resultados"}
              </p>
            </div>
          )}

          {indicadores.suficiente_anonimato && (
            <>
              {/* KPIs globales */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
                  <p className="text-3xl font-bold text-brand-600 dark:text-brand-400">
                    {indicadores.indice_global.toFixed(1)}
                    <span className="text-sm text-gray-400">/5</span>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Índice global</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {indicadores.n_total_respuestas}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Respuestas</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {indicadores.dimensiones.filter((d) => d.nivel_riesgo === "alto").length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Dimensiones en riesgo alto</p>
                </div>
              </div>

              {/* Dimensiones */}
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {["Dimensión", "Media (1–5)", "Mediana", "Riesgo", "Respuestas"].map((h) => (
                        <th key={h} scope="col" className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900 text-sm">
                    {indicadores.dimensiones
                      .sort((a, b) => a.media - b.media)
                      .map((d) => (
                        <tr key={d.dimension} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                            {DIM_NOMBRE[d.dimension] ?? d.dimension}
                          </td>
                          <td className="px-4 py-3 w-36">
                            <MediaBar valor={d.media} />
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 tabular-nums">
                            {d.mediana.toFixed(1)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RIESGO_COLOR[d.nivel_riesgo]}`}>
                              {d.nivel_riesgo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 tabular-nums">
                            {d.n_respuestas}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {!cargandoEnc && !encuestas?.length && (
        <p className="text-center text-sm text-gray-400 py-12">
          No hay encuestas disponibles.
        </p>
      )}
    </main>
  );
}
