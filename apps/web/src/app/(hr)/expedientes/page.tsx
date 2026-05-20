"use client";
import { useState } from "react";
import { useApiQuery } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import { useSession } from "next-auth/react";

interface ExpedienteResumen {
  id: string;
  referencia: string;
  denunciaId: string;
  tipoAcoso: string;
  estado: "ABIERTO" | "EN_INSTRUCCION" | "PENDIENTE_FIRMA" | "CERRADO" | "ARCHIVADO";
  instructorId: string | null;
  fechaApertura: string;
  fechaCierre: string | null;
  totalEventos: number;
  plazosVencidos: number;
  updatedAt: string;
}

const ESTADO_BADGE: Record<string, string> = {
  ABIERTO: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  EN_INSTRUCCION: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  PENDIENTE_FIRMA: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  CERRADO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ARCHIVADO: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export default function ExpedientesPage() {
  const { data: session } = useSession();
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);

  // empresaId viene del token JWT
  const empresaId = (session?.user as any)?.empresaId;

  const { data, isLoading, isError } = useApiQuery(
    ["expedientes", empresaId, estado, page],
    () =>
      apiClient
        .get<{ items: ExpedienteResumen[]; total: number; page: number; size: number }>(
          "http://localhost:8080/api/v1/expedientes",
          { params: { empresaId, estado: estado || undefined, page, size: 20 } }
        )
        .then((r) => r.data),
    { enabled: !!empresaId }
  );

  return (
    <main id="main-content" className="space-y-6 px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expedientes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestión de expedientes disciplinarios — M5
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={estado}
            onChange={(e) => { setEstado(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label="Filtrar por estado"
          >
            <option value="">Todos los estados</option>
            <option value="ABIERTO">Abiertos</option>
            <option value="EN_INSTRUCCION">En instrucción</option>
            <option value="PENDIENTE_FIRMA">Pendiente firma</option>
            <option value="CERRADO">Cerrados</option>
            <option value="ARCHIVADO">Archivados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando expedientes">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div role="alert" className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          Error al cargar los expedientes. Verifica que el servicio case-management está activo.
        </div>
      )}

      {data && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Referencia", "Tipo", "Estado", "Instructor", "Eventos", "Plazos", "Apertura"].map((h) => (
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
                {data.items.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {exp.referencia}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {exp.tipoAcoso.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[exp.estado] ?? ""}`}>
                        {exp.estado.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {exp.instructorId ? exp.instructorId.slice(0, 8) + "…" : "Sin asignar"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                      {exp.totalEventos}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.plazosVencidos > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
                          ⚠ {exp.plazosVencidos}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(exp.fechaApertura).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/rrhh/expedientes/${exp.id}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                      >
                        Abrir
                      </a>
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                      No hay expedientes con los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data.total > 20 && (
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{data.total} expedientes en total</span>
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
