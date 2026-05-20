"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface ModuloResumen {
  id: string;
  titulo: string;
  orden: number;
  duracion_minutos: number;
  tipo: "video" | "texto" | "quiz";
  completado: boolean;
  puntuacion: number | null;
}

interface CursoDetalle {
  id: string;
  titulo: string;
  descripcion: string;
  objetivos: string[];
  perfiles_destino: string[];
  duracion_total_minutos: number;
  modulos: ModuloResumen[];
  inscrito: boolean;
  progreso_pct: number;
  certificado_id: string | null;
}

const TIPO_ICON: Record<string, string> = {
  video: "▶",
  texto: "📄",
  quiz: "✏️",
};

export default function CursoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [quizPuntuacion, setQuizPuntuacion] = useState<Record<string, number>>({});
  const [moduloActivo, setModuloActivo] = useState<string | null>(null);

  const { data: curso, isLoading, refetch } = useApiQuery(
    ["curso", id],
    () => apiClient.get<CursoDetalle>(`/api/v1/formacion/cursos/${id}`).then((r) => r.data)
  );

  const completarMutation = useApiMutation(
    ({ moduloId, puntuacion }: { moduloId: string; puntuacion?: number }) =>
      apiClient
        .post(`/api/v1/formacion/modulos/${moduloId}/completar`, { puntuacion })
        .then((r) => r.data),
    {
      onSuccess: (data) => {
        refetch();
        if (data.certificado_id) {
          router.push(`/formacion/certificados/${data.certificado_id}`);
        }
      },
    }
  );

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (!curso) return null;

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Volver a formación
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{curso.titulo}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{curso.descripcion}</p>
      </div>

      {/* Progreso */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Progreso del curso
          </span>
          <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
            {curso.progreso_pct}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={curso.progreso_pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso: ${curso.progreso_pct}%`}
          className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
        >
          <div
            className="bg-brand-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${curso.progreso_pct}%` }}
          />
        </div>
        {curso.certificado_id && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-medium">
            ✓ Curso completado — certificado disponible
          </p>
        )}
      </div>

      {/* Objetivos */}
      {curso.objetivos.length > 0 && (
        <section aria-labelledby="objetivos-title">
          <h2 id="objetivos-title" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Objetivos de aprendizaje
          </h2>
          <ul className="space-y-1">
            {curso.objetivos.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="text-brand-500 mt-0.5" aria-hidden="true">✓</span>
                {o}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Módulos */}
      <section aria-labelledby="modulos-title">
        <h2 id="modulos-title" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Módulos ({curso.modulos.length})
        </h2>
        <div className="space-y-2">
          {curso.modulos.map((m, idx) => {
            const prevCompletado = idx === 0 || curso.modulos[idx - 1].completado;
            const bloqueado = !curso.inscrito || !prevCompletado;
            const esActivo = moduloActivo === m.id;

            return (
              <div
                key={m.id}
                className={`rounded-xl border transition-colors ${
                  m.completado
                    ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
                    : bloqueado
                    ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                }`}
              >
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => setModuloActivo(esActivo ? null : m.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  aria-expanded={esActivo}
                >
                  <span className="text-base" aria-hidden="true">
                    {m.completado ? "✅" : TIPO_ICON[m.tipo]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {m.orden}. {m.titulo}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {m.tipo} · {m.duracion_minutos} min
                      {m.puntuacion !== null && ` · Puntuación: ${m.puntuacion}/100`}
                    </p>
                  </div>
                  {!bloqueado && (
                    <span className="text-gray-400 text-sm" aria-hidden="true">
                      {esActivo ? "▲" : "▼"}
                    </span>
                  )}
                </button>

                {/* Panel expandido */}
                {esActivo && !bloqueado && (
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
                    {m.tipo === "video" && (
                      <div className="rounded-lg bg-black aspect-video flex items-center justify-center">
                        <p className="text-white text-xs opacity-50">
                          Reproductor de vídeo — contenido pendiente de carga
                        </p>
                      </div>
                    )}
                    {m.tipo === "texto" && (
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-600 dark:text-gray-400 min-h-[100px]">
                        Contenido del módulo — cargado desde CMS
                      </div>
                    )}
                    {m.tipo === "quiz" && !m.completado && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                          Puntuación obtenida (0–100)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={quizPuntuacion[m.id] ?? ""}
                          onChange={(e) =>
                            setQuizPuntuacion((q) => ({
                              ...q,
                              [m.id]: Number(e.target.value),
                            }))
                          }
                          className="block w-32 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          placeholder="ej. 85"
                        />
                      </div>
                    )}
                    {!m.completado && (
                      <button
                        type="button"
                        onClick={() =>
                          completarMutation.mutate({
                            moduloId: m.id,
                            puntuacion: m.tipo === "quiz" ? quizPuntuacion[m.id] : undefined,
                          })
                        }
                        disabled={
                          completarMutation.isPending ||
                          (m.tipo === "quiz" && quizPuntuacion[m.id] === undefined)
                        }
                        className="px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        Marcar como completado
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
