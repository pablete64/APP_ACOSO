"use client";
import { useFormContext } from "react-hook-form";
import type { DenunciaFormValues } from "./types";

// Wrapper ligero: reutiliza EncryptedFileUpload del ui-kit si está disponible,
// o renderiza un input nativo como fallback para no bloquear el wizard.
let EncryptedFileUpload: React.ComponentType<{
  onFilesEncrypted: (files: EncryptedFilePayload[]) => void;
  maxFiles?: number;
  className?: string;
}> | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  EncryptedFileUpload = require("@safework/ui-kit").EncryptedFileUpload;
} catch {
  // ui-kit todavía no está enlazado en local — se usa fallback
}

export interface EncryptedFilePayload {
  nombre_archivo: string;
  tipo_mime: string;
  tamano_bytes: number;
  sha256_original: string;
  storage_key: string;
  iv_b64: string;
}

export function StepEvidencias() {
  const { setValue, watch } = useFormContext<DenunciaFormValues>();
  const evidencias = watch("evidencias") ?? [];

  const handleFilesEncrypted = (files: EncryptedFilePayload[]) => {
    setValue("evidencias", files, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Evidencias <span className="text-gray-400 font-normal text-base">(opcional)</span>
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Puedes adjuntar hasta 10 archivos. Se cifran en tu dispositivo antes de subirse.
          El servidor nunca accede al contenido original.
        </p>
      </div>

      {EncryptedFileUpload ? (
        <EncryptedFileUpload
          onFilesEncrypted={handleFilesEncrypted}
          maxFiles={10}
          className="min-h-[180px]"
        />
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Componente de carga de evidencias cifradas
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Disponible en la versión desplegada con @safework/ui-kit enlazado
          </p>
        </div>
      )}

      {evidencias.length > 0 && (
        <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>{evidencias.length}</strong> archivo{evidencias.length !== 1 ? "s" : ""} cifrado{evidencias.length !== 1 ? "s" : ""} y listo{evidencias.length !== 1 ? "s" : ""} para adjuntar
          </p>
        </div>
      )}

      <div className="rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-4 text-xs text-amber-800 dark:text-amber-200">
        <strong>Formatos aceptados:</strong> PDF, imágenes (JPG, PNG, GIF), documentos (Word,
        Excel), audio (MP3, WAV), vídeo (MP4). Máximo 50 MB por archivo.
      </div>
    </div>
  );
}
