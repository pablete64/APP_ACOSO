"use client";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface Cita {
  id: string;
  solicitante_id: string;
  persona_designada_id: string;
  modalidad: string;
  fecha_propuesta: string;
  fecha_confirmada: string | null;
  estado: "pendiente" | "confirmada" | "cancelada" | "completada";
  enlace_videollamada: string | null;
  updated_at: string;
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente:  "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  confirmada: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelada:  "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  completada: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

const MODALIDAD_ICON: Record<string, string> = {
  presencial: "🏢", telefonica: "📞", videollamada: "💻",
};

export default function CitasIgualdadPage() {
  const [fechaConfirmar, setFechaConfirmar] = useState<Record<string, string>>({});

  const { data: citas, isLoading, refetch } = useApiQuery(
    ["citas-igualdad"],
    () => apiClient.get<Cita[]>("/api/v1/contacto/citas").then((r) => r.data)
  );

  const confirmarMutation = useApiMutation(
    ({ id, fecha }: { id: string; fecha: string }) =>
      apiClient.patch(`/api/v1/contacto/citas/${id}`, {
        estado: "confirmada",
        fecha_confirmada: new Date(fecha).toISOString(),
      }).then((r) => r.data),
    { onSuccess: () => refetch() }
  );

  const cancelarMutation = useApiMutation(
    (id: string) =>
      apiClient.patch(`/api/v1/contacto/citas/${id}`, { estado: "cancelada" }).then((r) => r.data),
    { onSuccess: () => refetch() }
  );

  const pendientes = citas?.filter((c) => c.estado === "pendiente") ?? [];
  const resto      = citas?.filter((c) => c.estado !== "pendiente") ?? [];

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenda de citas</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gestión de solicitudes de cita — equipo de Igualdad
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {/* Pendientes de confirmar */}
      {pendientes.length > 0 && (
        <section aria-labelledby="pendientes-title">
          <h2 id="pendientes-title" className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3">
            Pendientes de confirmar ({pendientes.length})
          </h2>
          <div className="space-y-3">
            {pendientes.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-hidden="true">{MODALIDAD_ICON[c.modalidad] ?? "📅"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                      Cita {c.modalidad}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Propuesta: {new Date(c.fecha_propuesta).toLocaleString("es-ES")}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[c.estado]}`}>
                    {c.estado}
                  </span>
                </div>

                {/* Confirmar con fecha */}
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={`fecha-${c.id}`}
                      className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                    >
                      Fecha confirmada
                    </label>
                    <input
                      id={`fecha-${c.id}`}
                      type="datetime-local"
                      value={fechaConfirmar[c.id] ?? c.fecha_propuesta.slice(0, 16)}
                      onChange={(e) =>
                        setFechaConfirmar((f) => ({ ...f, [c.id]: e.target.value }))
                      }
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      confirmarMutation.mutate({
                        id: c.id,
                        fecha: fechaConfirmar[c.id] ?? c.fecha_propuesta,
                      })
                    }
                    disabled={confirmarMutation.isPending}
                    className="px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg min-h-[36px] disabled:opacity-50 transition-colors"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelarMutation.mutate(c.id)}
                    disabled={cancelarMutation.isPending}
                    className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg min-h-[36px] disabled:opacity-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resto */}
      {resto.length > 0 && (
        <section aria-labelledby="resto-title">
          <h2 id="resto-title" className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Historial
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {["Modalidad", "Fecha propuesta", "Fecha confirmada", "Estado", "Enlace"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900 text-sm">
                {resto.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 capitalize">{MODALIDAD_ICON[c.modalidad]} {c.modalidad}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      {new Date(c.fecha_propuesta).toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      {c.fecha_confirmada
                        ? new Date(c.fecha_confirmada).toLocaleString("es-ES")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[c.estado]}`}>
                        {c.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.enlace_videollamada ? (
                        <a
                          href={c.enlace_videollamada}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Sala
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {citas?.length === 0 && !isLoading && (
        <p className="text-center text-sm text-gray-400 py-10">No hay citas registradas.</p>
      )}
    </main>
  );
}
