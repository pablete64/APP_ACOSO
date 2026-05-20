"use client";
import { useFormContext } from "react-hook-form";
import type { DenunciaFormValues } from "./types";

const TIPOS_ACOSO = [
  { value: "acoso_sexual", label: "Acoso sexual" },
  { value: "acoso_por_razon_de_sexo", label: "Acoso por razón de sexo" },
  { value: "acoso_moral", label: "Acoso moral (mobbing)" },
  { value: "acoso_discriminatorio", label: "Acoso discriminatorio" },
  { value: "violencia_fisica", label: "Violencia física" },
  { value: "otro", label: "Otro" },
];

export function StepContexto() {
  const { register, watch, formState: { errors } } = useFormContext<DenunciaFormValues>();
  const modalidad = watch("modalidad");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Tipo y modalidad
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Selecciona cómo quieres presentar la denuncia y el tipo de situación.
        </p>
      </div>

      {/* Modalidad */}
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Modalidad de denuncia
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              value: "anonima",
              label: "Anónima",
              desc: "Tu identidad no quedará registrada en el sistema",
              icon: "🛡️",
            },
            {
              value: "identificada",
              label: "Identificada",
              desc: "Tu nombre quedará cifrado y solo accesible por Igualdad",
              icon: "👤",
            },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus-within:ring-2 focus-within:ring-brand-500 ${
                modalidad === opt.value
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-950"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              <input
                type="radio"
                value={opt.value}
                {...register("modalidad")}
                className="sr-only"
                aria-describedby={`modalidad-desc-${opt.value}`}
              />
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">{opt.icon}</span>
                <div>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {opt.label}
                  </span>
                  <span
                    id={`modalidad-desc-${opt.value}`}
                    className="block text-xs text-gray-500 dark:text-gray-400 mt-1"
                  >
                    {opt.desc}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>
        {errors.modalidad && (
          <p role="alert" className="mt-2 text-xs text-red-600">{errors.modalidad.message}</p>
        )}
      </fieldset>

      {/* Tipo de acoso */}
      <div>
        <label
          htmlFor="tipo_acoso"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Tipo de situación
        </label>
        <select
          id="tipo_acoso"
          {...register("tipo_acoso")}
          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-describedby="tipo-acoso-error"
        >
          <option value="">Selecciona una opción...</option>
          {TIPOS_ACOSO.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {errors.tipo_acoso && (
          <p id="tipo-acoso-error" role="alert" className="mt-1 text-xs text-red-600">
            {errors.tipo_acoso.message}
          </p>
        )}
      </div>

      {/* Aviso legal */}
      <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 text-xs text-blue-800 dark:text-blue-200">
        <strong>Ley 2/2023 de protección al informante:</strong> Esta denuncia está
        protegida por el marco legal español y europeo. Se garantiza la confidencialidad
        del denunciante y la prohibición expresa de represalias.
      </div>
    </div>
  );
}
