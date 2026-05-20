"use client";
import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCrypto } from "@/lib/crypto/CryptoProvider";
import { useApiMutation } from "@/lib/api/hooks";
import { apiClient } from "@/lib/api/client";
import {
  StepContexto,
  StepRelato,
  StepEvidencias,
  StepConfirmacion,
} from "@/components/modules/m1";
import type { DenunciaFormValues } from "@/components/modules/m1";

// ── Validación por paso ───────────────────────────────────────────────────────

const schema = z.object({
  modalidad: z.enum(["anonima", "identificada"], {
    required_error: "Selecciona una modalidad",
  }),
  tipo_acoso: z.string().min(3, "Selecciona el tipo de situación"),
  fecha_hechos: z.string().optional(),
  lugar: z.string().max(200).optional(),
  relato: z.string().min(100, "Describe los hechos con al menos 100 caracteres").max(5000),
  personas_involucradas: z.string().max(1000).optional(),
  evidencias: z.array(z.any()).max(10).default([]),
});

const STEP_FIELDS: Array<(keyof DenunciaFormValues)[]> = [
  ["modalidad", "tipo_acoso"],
  ["relato"],
  ["evidencias"],
  [],
];

const STEPS = [
  { label: "Contexto", component: StepContexto },
  { label: "Relato", component: StepRelato },
  { label: "Evidencias", component: StepEvidencias },
  { label: "Confirmación", component: StepConfirmacion },
];

// ── Página ────────────────────────────────────────────────────────────────────

export default function DenunciaPage() {
  const [step, setStep] = useState(0);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);
  const { encrypt } = useCrypto();

  const methods = useForm<DenunciaFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      modalidad: "anonima",
      tipo_acoso: "",
      relato: "",
      evidencias: [],
    },
    mode: "onTouched",
  });

  const mutation = useApiMutation(
    async (payload: DenunciaFormValues) => {
      // Construir plaintext para cifrado
      const plaintext = JSON.stringify({
        relato: payload.relato,
        lugar: payload.lugar,
        fecha_hechos: payload.fecha_hechos,
        personas_involucradas: payload.personas_involucradas,
      });

      const { ciphertext_b64, iv_b64 } = await encrypt(plaintext);

      const body = {
        modalidad: payload.modalidad,
        tipo_acoso: payload.tipo_acoso,
        ciphertext_b64,
        iv_b64,
        evidencias: payload.evidencias,
      };

      const res = await apiClient.post<{ tracking_code: string }>("/api/v1/denuncias", body);
      return res.data;
    },
    {
      onSuccess: (data) => {
        setTrackingCode(data.tracking_code);
      },
    }
  );

  const CurrentStep = STEPS[step].component;

  const handleNext = async () => {
    const fields = STEP_FIELDS[step];
    const valid = fields.length === 0 || await methods.trigger(fields as any);
    if (valid) setStep((s) => s + 1);
  };

  const handleSubmit = methods.handleSubmit((data) => {
    mutation.mutate(data);
  });

  // ── Éxito ─────────────────────────────────────────────────────────────────

  if (trackingCode) {
    return (
      <main id="main-content" className="max-w-xl mx-auto px-4 py-12 text-center">
        <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-8 space-y-4">
          <div className="text-5xl" aria-hidden="true">✅</div>
          <h1 className="text-xl font-bold text-green-900 dark:text-green-100">
            Denuncia registrada
          </h1>
          <p className="text-sm text-green-700 dark:text-green-300">
            Guarda tu código de seguimiento. Es la única forma de consultar el estado
            y comunicarte con el equipo de instrucción.
          </p>
          <div
            className="font-mono text-2xl font-bold tracking-[0.25em] text-green-900 dark:text-green-100 bg-white dark:bg-green-900 rounded-lg px-6 py-4 select-all"
            aria-label={`Código de seguimiento: ${trackingCode}`}
          >
            {trackingCode.match(/.{1,4}/g)?.join("-")}
          </div>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(trackingCode)}
            className="text-sm text-green-700 dark:text-green-300 underline hover:no-underline"
          >
            Copiar código
          </button>
          <p className="text-xs text-green-600 dark:text-green-400">
            Ley 2/2023: estás protegido frente a represalias. Tu identidad es confidencial.
          </p>
        </div>
      </main>
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────

  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-8">
      {/* Stepper */}
      <nav aria-label="Pasos del formulario" className="mb-8">
        <ol className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <li key={s.label} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                    i < step
                      ? "bg-brand-600 border-brand-600 text-white"
                      : i === step
                      ? "border-brand-600 text-brand-600 dark:text-brand-400"
                      : "border-gray-300 text-gray-400"
                  }`}
                  aria-current={i === step ? "step" : undefined}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span
                  className={`mt-1 text-xs font-medium ${
                    i === step
                      ? "text-brand-600 dark:text-brand-400"
                      : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    i < step ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Formulario */}
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm min-h-[420px]">
            <CurrentStep />
          </div>

          {/* Error de envío */}
          {mutation.isError && (
            <div role="alert" className="mt-4 rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
              Error al enviar la denuncia. Por favor inténtalo de nuevo.
            </div>
          )}

          {/* Navegación */}
          <div className="mt-6 flex justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
            >
              Atrás
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg min-h-[44px] transition-colors"
              >
                Siguiente
              </button>
            ) : (
              <button
                type="submit"
                disabled={mutation.isPending}
                className="px-6 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg min-h-[44px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Enviando…" : "Enviar denuncia"}
              </button>
            )}
          </div>
        </form>
      </FormProvider>
    </main>
  );
}
