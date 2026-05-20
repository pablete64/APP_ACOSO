"use client";
import { useState } from "react";
import { useApiQuery } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface DenunciaResumen {
  id: string;
  tracking_code: string;
  modalidad: "anonima" | "identificada";
  tipo_acoso: string;
  estado: string;
  gravedad_ia: string | null;
  created_at: string;
  updated_at: string;
}

const ESTADO_BADGE: Record<string, string> = {
  recibida: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_revision: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  archivada: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  resuelta: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const GRAVEDAD_BADGE: Record<string, string> = {
  alta: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  media: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  baja: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export default function DenunciasEqualityPage() {
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useApiQuery(
    ["denuncias", estado, page],
    () =>
      apiClient
        .get<{ items: DenunciaResumen[]; total: number; page: number; size: number }>(
          "/api/v1/denuncias",
          { params: { estado: estado || undefined, page, size: 20 } }
        )
        .then((r) => r.data)
  );

  return (
    <main id="main-content" className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Denuncias</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Canal seguro de denuncia — gestión desde Igualdad
          </p>
        </div>

        {/* Filtro estado */}
        <select
          value={estado}
          onChange={(e) => { setEstado(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          <option value="recibida">Recibidas</option>
          <option value="en_revision">En revisión</option>
          <option value="resuelta">Resueltas</option>
          <option value="archivada">Archivadas</option>
        </select>
      </div>

      {/* Tabla */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando denuncias">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          Error al cargar las denuncias. Inténtalo de nuevo.
        </div>
      )}

      {data && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Tracking", "Tipo", "Modalidad", "Estado", "Gravedad IA", "Fecha"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="sr-only">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
                {data.items.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">
                      {d.tracking_code.match(/.{1,4}/g)?.join("-")}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {d.tipo_acoso.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={d.modalidad === "anonima" ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}>
                        {d.modalidad === "anonima" ? "🛡️ Anónima" : "👤 Identificada"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[d.estado] ?? "bg-gray-100 text-gray-600"}`}>
                        {d.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.gravedad_ia ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${GRAVEDAD_BADGE[d.gravedad_ia] ?? ""}`}>
                          {d.gravedad_ia}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/igualdad/denuncias/${d.id}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        Ver
                      </a>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                      No hay denuncias con los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {data.total > 20 && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{data.total} denuncias en total</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[36px]"
                >
                  Anterior
                </button>
                <span className="px-3 py-1.5">Pág. {page}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= data.total}
                  className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[36px]"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
