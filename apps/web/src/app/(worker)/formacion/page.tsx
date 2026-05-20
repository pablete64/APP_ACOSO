"use client";
import { useState } from "react";
import Link from "next/link";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface CursoResumen {
  id: string;
  titulo: string;
  descripcion: string;
  perfiles_destino: string[];
  duracion_total_minutos: number;
  num_modulos: number;
  inscrito: boolean;
  progreso_pct: number;
  certificado_id: string | null;
}

interface RecursoNormativo {
  id: string;
  titulo: string;
  tipo: "ley" | "reglamento" | "guia" | "jurisprudencia" | "protocolo";
  organismo: string;
  url: string;
  fecha: string;
  resumen: string | null;
  etiquetas: string[];
}

const TIPO_BADGE: Record<string, string> = {
  ley:           "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  reglamento:    "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  guia:          "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  jurisprudencia:"bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  protocolo:     "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

const TIPO_FILTROS = ["todos", "ley", "reglamento", "guia", "jurisprudencia", "protocolo"] as const;

function ProgressRing({ pct }: { pct: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="52" height="52" aria-hidden="true" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor"
        className="text-gray-200 dark:text-gray-700" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="currentColor"
        className="text-brand-500" strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 26 26)" />
      <text x="26" y="30" textAnchor="middle" fontSize="11"
        className="fill-gray-700 dark:fill-gray-200" fontWeight="600">
        {pct}%
      </text>
    </svg>
  );
}

export default function FormacionPage() {
  const [tab, setTab] = useState<"cursos" | "biblioteca">("cursos");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");

  const { data: cursos, isLoading: cargandoCursos, refetch: refetchCursos } = useApiQuery(
    ["cursos"],
    () => apiClient.get<CursoResumen[]>("/api/v1/formacion/cursos").then((r) => r.data),
    { enabled: tab === "cursos" }
  );

  const { data: recursos, isLoading: cargandoRecursos } = useApiQuery(
    ["biblioteca", tipoFiltro],
    () => {
      const params = tipoFiltro !== "todos" ? `?tipo=${tipoFiltro}` : "";
      return apiClient.get<RecursoNormativo[]>(`/api/v1/formacion/biblioteca${params}`).then((r) => r.data);
    },
    { enabled: tab === "biblioteca" }
  );

  const inscribirMutation = useApiMutation(
    (cursoId: string) =>
      apiClient.post(`/api/v1/formacion/cursos/${cursoId}/inscribir`).then(() => undefined),
    { onSuccess: () => refetchCursos() }
  );

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Formación y recursos
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Cursos sobre prevención del acoso y biblioteca normativa actualizada
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6" aria-label="Secciones">
          {(["cursos", "biblioteca"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t === "cursos" ? "Cursos" : "Biblioteca normativa"}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Cursos ─────────────────────────────────────────────────────────── */}
      {tab === "cursos" && (
        <>
          {cargandoCursos && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {cursos && cursos.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-12">
              No hay cursos disponibles para tu perfil.
            </p>
          )}

          {cursos && cursos.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {cursos.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start gap-4">
                    <ProgressRing pct={c.progreso_pct} />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                        {c.titulo}
                      </h2>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {c.descripcion}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>🎓 {c.num_modulos} módulos</span>
                    <span>⏱ {c.duracion_total_minutos} min</span>
                    {c.certificado_id && (
                      <Link
                        href={`/formacion/certificados/${c.certificado_id}`}
                        className="ml-auto text-brand-600 dark:text-brand-400 font-medium hover:underline"
                      >
                        Ver certificado →
                      </Link>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    {!c.inscrito ? (
                      <button
                        type="button"
                        onClick={() => inscribirMutation.mutate(c.id)}
                        disabled={inscribirMutation.isPending}
                        className="flex-1 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        Inscribirme
                      </button>
                    ) : (
                      <Link
                        href={`/formacion/cursos/${c.id}`}
                        className="flex-1 py-2 text-xs font-medium text-center text-brand-600 dark:text-brand-400 border border-brand-300 dark:border-brand-700 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                      >
                        {c.progreso_pct === 100 ? "Repasar curso" : "Continuar"}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Biblioteca normativa ────────────────────────────────────────────── */}
      {tab === "biblioteca" && (
        <>
          {/* Filtro tipo */}
          <div className="flex gap-2 flex-wrap">
            {TIPO_FILTROS.map((t) => (
              <button
                key={t}
                onClick={() => setTipoFiltro(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  tipoFiltro === t
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400"
                }`}
              >
                {t === "todos" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {cargandoRecursos && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {recursos && recursos.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-12">
              No hay recursos para este filtro.
            </p>
          )}

          {recursos && recursos.length > 0 && (
            <div className="space-y-3">
              {recursos.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BADGE[r.tipo]}`}>
                          {r.tipo}
                        </span>
                        <span className="text-xs text-gray-400">{r.organismo}</span>
                        <span className="text-xs text-gray-400 ml-auto">{r.fecha}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {r.titulo}
                      </p>
                      {r.resumen && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {r.resumen}
                        </p>
                      )}
                      {r.etiquetas.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {r.etiquetas.map((e) => (
                            <span key={e} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded">
                              {e}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-gray-400 group-hover:text-brand-500 transition-colors shrink-0" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
