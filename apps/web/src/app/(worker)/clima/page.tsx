"use client";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";

interface PreguntaClima {
  id: string;
  texto: string;
  dimension: string;
  escala: "likert5" | "likert7" | "binaria";
}

interface EncuestaActiva {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  preguntas: PreguntaClima[];
}

const LIKERT_LABELS_5 = ["Nunca", "Casi nunca", "A veces", "Casi siempre", "Siempre"];

export default function ClimaPage() {
  const [respondida, setRespondida] = useState(false);
  const [valores, setValores] = useState<Record<string, number>>({});

  const { data: encuestas, isLoading } = useApiQuery(
    ["clima-activas"],
    () => apiClient.get<EncuestaActiva[]>("/api/v1/clima/encuestas/activas").then((r) => r.data)
  );

  const enviarMutation = useApiMutation(
    ({ encuestaId, resp }: { encuestaId: string; resp: { pregunta_id: string; valor: number }[] }) =>
      apiClient.post("/api/v1/clima/respuestas", {
        encuesta_id: encuestaId,
        respuestas: resp,
      }).then(() => undefined),
    {
      onSuccess: () => setRespondida(true),
    }
  );

  const encuesta = encuestas?.[0] ?? null;

  const handleEnviar = () => {
    if (!encuesta) return;
    const respuestas = encuesta.preguntas.map((p) => ({
      pregunta_id: p.id,
      valor: valores[p.id] ?? 3,
    }));
    enviarMutation.mutate({ encuestaId: encuesta.id, resp: respuestas });
  };

  const todasRespondidas =
    encuesta?.preguntas.every((p) => valores[p.id] !== undefined) ?? false;

  if (isLoading) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        <div className="h-8 w-56 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
      </main>
    );
  }

  if (respondida) {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="text-5xl" aria-hidden="true">✅</div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          ¡Gracias por tu participación!
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Tu respuesta es completamente anónima y ayuda a mejorar el entorno de trabajo.
          Los resultados se muestran siempre de forma agregada, nunca individual.
        </p>
        <div className="mt-4 rounded-xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 text-xs text-blue-700 dark:text-blue-300">
          🔒 No se ha registrado tu nombre ni identificador en ningún momento.
        </div>
      </main>
    );
  }

  if (!encuesta) {
    return (
      <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 text-center space-y-3">
        <div className="text-4xl" aria-hidden="true">📊</div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Termómetro de clima
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No hay ninguna encuesta activa en este momento. Vuelve más adelante.
        </p>
      </main>
    );
  }

  const diasRestantes = Math.max(
    0,
    Math.ceil(
      (new Date(encuesta.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Cabecera */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-white dark:from-brand-950 dark:to-gray-900 border border-brand-100 dark:border-brand-800 p-6 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {encuesta.titulo}
          </h1>
          <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
            {diasRestantes} día{diasRestantes !== 1 ? "s" : ""} restante{diasRestantes !== 1 ? "s" : ""}
          </span>
        </div>
        {encuesta.descripcion && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{encuesta.descripcion}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span role="img" aria-label="candado">🔒</span>
          Respuesta 100% anónima — sin nombre, sin usuario, sin IP registrada
        </div>
      </div>

      {/* Progreso */}
      <div
        role="progressbar"
        aria-valuenow={Object.keys(valores).length}
        aria-valuemin={0}
        aria-valuemax={encuesta.preguntas.length}
        aria-label={`${Object.keys(valores).length} de ${encuesta.preguntas.length} preguntas respondidas`}
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5"
      >
        <div
          className="bg-brand-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(Object.keys(valores).length / encuesta.preguntas.length) * 100}%` }}
        />
      </div>

      {/* Preguntas */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleEnviar(); }}
        className="space-y-6"
      >
        {encuesta.preguntas.map((p, idx) => {
          const escala = p.escala === "likert7" ? 7 : 5;
          const labels = LIKERT_LABELS_5; // reutilizamos las de 5 para ambos
          const respondida = valores[p.id] !== undefined;

          return (
            <fieldset
              key={p.id}
              className={`rounded-xl border p-5 space-y-4 transition-colors ${
                respondida
                  ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              }`}
            >
              <legend className="text-sm font-medium text-gray-900 dark:text-white">
                <span className="text-gray-400 mr-2" aria-hidden="true">{idx + 1}.</span>
                {p.texto}
              </legend>

              {/* Escala Likert */}
              <div className="flex justify-between gap-1">
                {Array.from({ length: escala }, (_, i) => i + 1).map((val) => (
                  <label
                    key={val}
                    className="flex flex-col items-center gap-1 cursor-pointer group flex-1"
                  >
                    <input
                      type="radio"
                      name={p.id}
                      value={val}
                      checked={valores[p.id] === val}
                      onChange={() => setValores((v) => ({ ...v, [p.id]: val }))}
                      className="sr-only"
                    />
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all
                        ${valores[p.id] === val
                          ? "bg-brand-600 border-brand-600 text-white"
                          : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 group-hover:border-brand-400"
                        }`}
                      aria-hidden="true"
                    >
                      {val}
                    </div>
                    {escala === 5 && (
                      <span className="text-[10px] text-center text-gray-400 dark:text-gray-500 leading-tight hidden sm:block">
                        {labels[val - 1]}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 sm:hidden">
                <span>{labels[0]}</span>
                <span>{labels[labels.length - 1]}</span>
              </div>
            </fieldset>
          );
        })}

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={!todasRespondidas || enviarMutation.isPending}
            className="w-full py-3 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {enviarMutation.isPending ? "Enviando…" : "Enviar respuestas anónimas"}
          </button>
          {!todasRespondidas && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Responde todas las preguntas para continuar
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
