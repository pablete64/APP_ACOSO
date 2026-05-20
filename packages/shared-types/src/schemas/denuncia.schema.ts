import { z } from "zod";

// Tipos de archivo permitidos como evidencia
const TIPOS_MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "video/mp4",
  "video/webm",
] as const;

const MAX_TAMANO_ARCHIVO_MB = 50;
const MAX_ARCHIVOS = 10;

// --- Paso 1: Contexto de la denuncia ---

export const paso1ContextoSchema = z.object({
  tipo: z.enum(["laboral", "sexual", "discriminacion", "otro"], {
    required_error: "Selecciona el tipo de situación",
  }),
  modalidad: z.enum(["anonima", "identificada"], {
    required_error: "Indica si quieres presentar la denuncia de forma anónima o identificada",
  }),
});

export type Paso1ContextoValues = z.infer<typeof paso1ContextoSchema>;

// --- Paso 2: Relato de los hechos ---

export const paso2RelatoSchema = z.object({
  // El relato se cifra en cliente — aquí solo validamos que no esté vacío
  // y que tenga cierta longitud mínima para que sea útil
  relato: z
    .string({ required_error: "El relato es obligatorio" })
    .min(50, "Describe la situación con al menos 50 caracteres para que podamos procesarla")
    .max(10000, "El relato no puede superar 10.000 caracteres"),
  fechaAproximada: z
    .string()
    .optional()
    .describe("Fecha aproximada en que ocurrió o comenzó la situación"),
  esReiterado: z.boolean().optional(),
  lugarHechos: z
    .string()
    .max(200, "Máximo 200 caracteres")
    .optional()
    .describe("Lugar de los hechos (centro de trabajo, reunión online, etc.)"),
});

export type Paso2RelatoValues = z.infer<typeof paso2RelatoSchema>;

// --- Paso 3: Evidencias ---

export const evidenciaSchema = z.object({
  nombre: z.string().min(1),
  tipoMime: z.enum(TIPOS_MIME_PERMITIDOS, {
    errorMap: () => ({ message: "Tipo de archivo no permitido" }),
  }),
  tamanoBytes: z
    .number()
    .max(
      MAX_TAMANO_ARCHIVO_MB * 1024 * 1024,
      `Cada archivo no puede superar ${MAX_TAMANO_ARCHIVO_MB} MB`
    ),
  sha256Hash: z.string().length(64, "Hash SHA-256 inválido"),
});

export const paso3EvidenciasSchema = z.object({
  evidencias: z
    .array(evidenciaSchema)
    .max(MAX_ARCHIVOS, `Puedes adjuntar un máximo de ${MAX_ARCHIVOS} archivos`)
    .optional()
    .default([]),
});

export type Paso3EvidenciasValues = z.infer<typeof paso3EvidenciasSchema>;

// --- Schema completo del formulario (todos los pasos) ---

export const denunciaCompletaSchema = paso1ContextoSchema
  .merge(paso2RelatoSchema)
  .merge(paso3EvidenciasSchema);

export type DenunciaCompletaFormValues = z.infer<typeof denunciaCompletaSchema>;

// --- Consulta de seguimiento ---

export const seguimientoSchema = z.object({
  codigoSeguimiento: z
    .string({ required_error: "Introduce tu código de seguimiento" })
    .length(10, "El código de seguimiento tiene exactamente 10 caracteres")
    .toUpperCase()
    .regex(/^[A-Z2-9]{10}$/, "Código de seguimiento inválido"),
});

export type SeguimientoFormValues = z.infer<typeof seguimientoSchema>;

// --- Mensaje de seguimiento ---

export const mensajeSeguimientoSchema = z.object({
  contenido: z
    .string({ required_error: "Escribe un mensaje" })
    .min(1, "El mensaje no puede estar vacío")
    .max(2000, "El mensaje no puede superar 2.000 caracteres"),
});

export type MensajeSeguimientoFormValues = z.infer<typeof mensajeSeguimientoSchema>;
