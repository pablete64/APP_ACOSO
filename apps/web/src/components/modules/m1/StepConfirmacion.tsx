"use client";
import { useFormContext } from "react-hook-form";
import type { DenunciaFormValues } from "./types";

const TIPO_LABELS: Record<string, string> = {
  acoso_sexual: "Acoso sexual",
  acoso_por_razon_de_sexo: "Acoso por razón de sexo",
  acoso_moral: "Acoso moral (mobbing)",
  acoso_discriminatorio: "Acoso discriminatorio",
  violencia_fisica: "Violencia física",
  otro: "Otro",
};

export function StepConfirmacion() {
  const { watch } = useFormContext<DenunciaFormValues>();
  const values = watch();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Confirmar y enviar
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Revisa el resumen antes de enviar. El contenido ya está cifrado en tu dispositivo.
        </p>
      </div>

      {/* Resumen */}
      <dl className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
        <Row label="Modalidad" value={values.modalidad === "anonima" ? "🛡️ Anónima" : "👤 Identificada"} />
        <Row label="Tipo" value={TIPO_LABELS[values.tipo_acoso] ?? values.tipo_acoso} />
        {values.fecha_hechos && <Row label="Fecha aprox." value={values.fecha_hechos} />}
        {values.lugar && <Row label="Lugar" value={values.lugar} />}
        <Row
          label="Descripción"
          value={`${values.relato?.length ?? 0} caracteres (cifrada)`}
        />
        <Row
          label="Evidencias"
          value={
            values.evidencias?.length
              ? `${values.evidencias.length} archivo${values.evidencias.length !== 1 ? "s" : ""} cifrado${values.evidencias.length !== 1 ? "s" : ""}`
              : "Sin evidencias"
          }
        />
      </dl>

      {/* Aviso cifrado */}
      <div className="rounded-md bg-brand-50 dark:bg-brand-950 border border-brand-200 dark:border-brand-800 p-4 text-sm text-brand-800 dark:text-brand-200">
        <p className="font-semibold mb-1">Tu privacidad está protegida</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>El texto se cifró con AES-256-GCM en tu navegador</li>
          <li>El servidor recibe únicamente datos cifrados</li>
          <li>Solo Igualdad puede descifrar el contenido con la clave compartida</li>
          {values.modalidad === "anonima" && (
            <li>Modalidad anónima: tu identidad no queda registrada</li>
          )}
        </ul>
      </div>

      {/* Ley 2/2023 */}
      <div className="rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-xs text-gray-600 dark:text-gray-300">
        <p className="font-medium mb-1">Declaración legal</p>
        <p>
          Al enviar esta denuncia confirmo que los hechos descritos son verídicos y
          que actúo de buena fe, conforme a lo exigido por la{" "}
          <strong>Ley 2/2023, de 20 de febrero</strong>, reguladora de la protección
          de las personas que informen sobre infracciones normativas.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex px-4 py-3 text-sm gap-4">
      <dt className="w-32 flex-none text-gray-500 dark:text-gray-400 font-medium">{label}</dt>
      <dd className="text-gray-900 dark:text-white break-words min-w-0">{value}</dd>
    </div>
  );
}
