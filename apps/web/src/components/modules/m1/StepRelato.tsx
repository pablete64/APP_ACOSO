"use client";
import { useFormContext } from "react-hook-form";
import type { DenunciaFormValues } from "./types";

export function StepRelato() {
  const { register, watch, formState: { errors } } = useFormContext<DenunciaFormValues>();
  const relato = watch("relato") ?? "";
  const MIN_CHARS = 100;
  const MAX_CHARS = 5000;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Descripción de los hechos
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tu relato se cifra en tu dispositivo antes de enviarse.
          El servidor nunca accede al contenido en texto plano.
        </p>
      </div>

      {/* Fecha aproximada */}
      <div>
        <label
          htmlFor="fecha_hechos"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Fecha aproximada de los hechos
          <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="date"
          id="fecha_hechos"
          {...register("fecha_hechos")}
          max={new Date().toISOString().split("T")[0]}
          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Lugar */}
      <div>
        <label
          htmlFor="lugar"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Lugar donde ocurrió
          <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
        </label>
        <input
          type="text"
          id="lugar"
          {...register("lugar")}
          placeholder="Ej: Oficina planta 3, reunión virtual, etc."
          maxLength={200}
          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Relato */}
      <div>
        <label
          htmlFor="relato"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Descripción detallada
          <span className="text-red-500 ml-1" aria-hidden="true">*</span>
        </label>
        <textarea
          id="relato"
          {...register("relato")}
          rows={8}
          placeholder="Describe los hechos con el mayor detalle posible: qué ocurrió, quién estuvo involucrado, con qué frecuencia, cómo te afectó..."
          maxLength={MAX_CHARS}
          aria-describedby="relato-hint relato-error"
          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
        <div className="flex justify-between mt-1">
          <p id="relato-hint" className="text-xs text-gray-500">
            Mínimo {MIN_CHARS} caracteres para una descripción útil
          </p>
          <p
            className={`text-xs tabular-nums ${
              relato.length > MAX_CHARS * 0.9 ? "text-amber-600" : "text-gray-400"
            }`}
            aria-live="polite"
          >
            {relato.length}/{MAX_CHARS}
          </p>
        </div>
        {errors.relato && (
          <p id="relato-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.relato.message}
          </p>
        )}
      </div>

      {/* Personas involucradas */}
      <div>
        <label
          htmlFor="personas_involucradas"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Personas involucradas
          <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          id="personas_involucradas"
          {...register("personas_involucradas")}
          rows={3}
          placeholder="Nombres, cargos, departamentos de las personas relacionadas con los hechos..."
          maxLength={1000}
          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
        />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 italic">
        Cifrado AES-256-GCM en tu navegador antes del envío. El servidor almacena
        únicamente datos cifrados.
      </p>
    </div>
  );
}
