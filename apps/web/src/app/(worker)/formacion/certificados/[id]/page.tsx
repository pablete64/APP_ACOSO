"use client";
import { useParams, useRouter } from "next/navigation";
import { useApiQuery } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface CertificadoResponse {
  id: string;
  usuario_id: string;
  curso_id: string;
  curso_titulo: string;
  emitido_en: string;
  url_pdf: string | null;
}

export default function CertificadoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: cert, isLoading } = useApiQuery(
    ["certificado", id],
    () => apiClient.get<CertificadoResponse>(`/api/v1/formacion/certificados/${id}`).then((r) => r.data)
  );

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-6">
        <div className="h-48 w-full bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </main>
    );
  }

  if (!cert) return null;

  const fecha = new Date(cert.emitido_en).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        ← Volver a formación
      </button>

      {/* Tarjeta certificado */}
      <div className="rounded-2xl border-2 border-brand-200 dark:border-brand-800 bg-gradient-to-br from-brand-50 to-white dark:from-brand-950 dark:to-gray-900 p-8 text-center space-y-4 shadow-sm">
        <div className="text-5xl" aria-hidden="true">🏆</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-500 mb-1">
            Certificado de finalización
          </p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {cert.curso_titulo}
          </h1>
        </div>

        <div className="w-16 h-px bg-brand-200 dark:bg-brand-700 mx-auto" />

        <div className="space-y-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Emitido el <span className="font-medium text-gray-900 dark:text-white">{fecha}</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            ID: {cert.id}
          </p>
        </div>

        <div className="pt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            SafeWork AI — Formación en prevención del acoso laboral
          </p>
        </div>
      </div>

      {/* Descarga PDF */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Descargar certificado PDF</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Documento firmado digitalmente
          </p>
        </div>
        {cert.url_pdf ? (
          <a
            href={cert.url_pdf}
            download
            className="px-4 py-2 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
          >
            Descargar PDF
          </a>
        ) : (
          <span className="text-xs text-gray-400 italic">Generación pendiente</span>
        )}
      </div>
    </main>
  );
}
