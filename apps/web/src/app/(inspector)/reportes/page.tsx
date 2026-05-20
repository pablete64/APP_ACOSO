"use client";
import { useApiQuery } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface ItemCumplimiento {
  norma: string;
  descripcion: string;
  estado: "cumple" | "parcial" | "pendiente";
  evidencia: string | null;
}

interface ReporteCumplimiento {
  empresa_id: string;
  fecha_generacion: string;
  items: ItemCumplimiento[];
  porcentaje_cumplimiento: number;
}

const ESTADO_STYLE: Record<string, string> = {
  cumple:   "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  parcial:  "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  pendiente:"bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const ESTADO_ICON: Record<string, string> = {
  cumple: "✓", parcial: "~", pendiente: "✗",
};

export default function ReportesInspectorPage() {
  const { data: reporte, isLoading } = useApiQuery(
    ["cumplimiento"],
    () =>
      apiClient
        .get<ReporteCumplimiento>("/api/v1/reportes/cumplimiento")
        .then((r) => r.data)
  );

  return (
    <main id="main-content" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Informe de cumplimiento normativo
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Vista de solo lectura para Inspección de Trabajo
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      )}

      {reporte && (
        <>
          {/* Resumen */}
          <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 flex items-center gap-6">
            <div className="text-center">
              <p className={`text-4xl font-bold ${
                reporte.porcentaje_cumplimiento >= 80
                  ? "text-green-600 dark:text-green-400"
                  : reporte.porcentaje_cumplimiento >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-red-600 dark:text-red-400"
              }`}>
                {reporte.porcentaje_cumplimiento}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cumplimiento global</p>
            </div>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generado el {new Date(reporte.fecha_generacion).toLocaleDateString("es-ES")}
              </p>
              <p className="text-xs text-gray-400">
                {reporte.items.filter((i) => i.estado === "cumple").length} de {reporte.items.length} ítems cumplidos
              </p>
            </div>
          </div>

          {/* Ítems */}
          <div className="space-y-3">
            {reporte.items.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${ESTADO_STYLE[item.estado]}`}
                    aria-label={`Estado: ${item.estado}`}
                  >
                    {ESTADO_ICON[item.estado]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {item.norma}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLE[item.estado]}`}>
                        {item.estado}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.descripcion}
                    </p>
                    {item.evidencia && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {item.evidencia}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center pt-2">
            Este informe se genera automáticamente a partir de los datos del sistema.
            Para obtener un PDF firmado, contacte con el administrador de la empresa.
          </p>
        </>
      )}
    </main>
  );
}
