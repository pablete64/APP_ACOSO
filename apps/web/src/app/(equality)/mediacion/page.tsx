"use client";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface MediacionResumen {
  id: string;
  expediente_id: string | null;
  mediador_id: string | null;
  estado: "solicitada" | "en_proceso" | "completada" | "cancelada";
  created_at: string;
  updated_at: string;
}

interface RepresaliaResumen {
  id: string;
  denuncia_id: string | null;
  estado: "registrada" | "investigando" | "resuelta";
  created_at: string;
}

const ESTADO_MED: Record<string, string> = {
  solicitada:  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  en_proceso:  "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completada:  "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  cancelada:   "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const ESTADO_REP: Record<string, string> = {
  registrada:   "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  investigando: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  resuelta:     "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

type Tab = "mediaciones" | "represalias";

export default function MediacionIgualdadPage() {
  const [tab, setTab] = useState<Tab>("mediaciones");

  const { data: mediaciones, isLoading: cargandoMed, refetch: refetchMed } = useApiQuery(
    ["mediaciones-igualdad"],
    () => apiClient.get<MediacionResumen[]>("/api/v1/apoyo/mediaciones").then((r) => r.data),
    { enabled: tab === "mediaciones" }
  );

  const { data: represalias, isLoading: cargandoRep } = useApiQuery(
    ["represalias-igualdad"],
    () => apiClient.get<RepresaliaResumen[]>("/api/v1/apoyo/represalias").then((r) => r.data),
    { enabled: tab === "represalias" }
  );

  const avanzarMutation = useApiMutation(
    ({ id, estado }: { id: string; estado: string }) =>
      apiClient.patch(`/api/v1/apoyo/mediaciones/${id}`, { estado }).then((r) => r.data),
    { onSuccess: () => refetchMed() }
  );

  const pendientes = mediaciones?.filter((m) => m.estado === "solicitada") ?? [];
  const resto = mediaciones?.filter((m) => m.estado !== "solicitada") ?? [];

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Mediación y represalias
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestión — equipo de Igualdad
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {(["mediaciones", "represalias"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t === "mediaciones" ? "Mediaciones" : "Represalias"}
              {t === "represalias" && (represalias?.filter((r) => r.estado === "registrada").length ?? 0) > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {represalias!.filter((r) => r.estado === "registrada").length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Mediaciones ─────────────────────────────────────────────────────── */}
      {tab === "mediaciones" && (
        <div className="space-y-6">
          {cargandoMed && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {/* Pendientes */}
          {pendientes.length > 0 && (
            <section aria-labelledby="pend-med-title">
              <h2 id="pend-med-title" className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">
                Solicitudes pendientes ({pendientes.length})
              </h2>
              <div className="space-y-3">
                {pendientes.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 flex items-center gap-4 flex-wrap"
                  >
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_MED[m.estado]}`}>
                        {m.estado}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Solicitada: {new Date(m.created_at).toLocaleString("es-ES")}
                      </p>
                      {m.expediente_id && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          Expediente: {m.expediente_id.slice(0, 8)}…
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => avanzarMutation.mutate({ id: m.id, estado: "en_proceso" })}
                        disabled={avanzarMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        Iniciar proceso
                      </button>
                      <button
                        type="button"
                        onClick={() => avanzarMutation.mutate({ id: m.id, estado: "cancelada" })}
                        disabled={avanzarMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg disabled:opacity-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Historial */}
          {resto.length > 0 && (
            <section aria-labelledby="hist-med-title">
              <h2 id="hist-med-title" className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Historial
              </h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {["ID", "Estado", "Expediente", "Última actualización", "Acción"].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                    {resto.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-4 py-3 text-xs font-mono text-gray-400">{m.id.slice(0, 8)}…</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_MED[m.estado]}`}>
                            {m.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {m.expediente_id ? m.expediente_id.slice(0, 8) + "…" : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {new Date(m.updated_at).toLocaleDateString("es-ES")}
                        </td>
                        <td className="px-4 py-3">
                          {m.estado === "en_proceso" && (
                            <button
                              type="button"
                              onClick={() => avanzarMutation.mutate({ id: m.id, estado: "completada" })}
                              disabled={avanzarMutation.isPending}
                              className="text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-50"
                            >
                              Completar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!cargandoMed && mediaciones?.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">No hay mediaciones registradas.</p>
          )}
        </div>
      )}

      {/* ── Represalias ──────────────────────────────────────────────────────── */}
      {tab === "represalias" && (
        <div className="space-y-4">
          {cargandoRep && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>
          )}

          {represalias && represalias.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-10">No hay represalias registradas.</p>
          )}

          {represalias && represalias.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {["Estado", "Denuncia vinculada", "Fecha", "Contenido"].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                  {represalias.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_REP[r.estado]}`}>
                          {r.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {r.denuncia_id ? r.denuncia_id.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString("es-ES")}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 italic">
                        🔒 Cifrado — requiere clave del denunciante
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
