import type { EncryptedFilePayload } from "./StepEvidencias";

export interface DenunciaFormValues {
  modalidad: "anonima" | "identificada";
  tipo_acoso: string;
  fecha_hechos?: string;
  lugar?: string;
  relato: string;
  personas_involucradas?: string;
  evidencias: EncryptedFilePayload[];
}
