import { z } from "zod";

// --- Solicitud de cita ---

// Mínimo 1 hora en el futuro, máximo 3 meses
const fechaFuturaSchema = z
  .string({ required_error: "Selecciona una fecha" })
  .refine(
    (val) => {
      const fecha = new Date(val);
      const ahora = new Date();
      const tresMeses = new Date();
      tresMeses.setMonth(tresMeses.getMonth() + 3);
      return fecha > ahora && fecha <= tresMeses;
    },
    { message: "La fecha debe ser futura y no superar 3 meses" }
  );

export const solicitarCitaSchema = z.object({
  personaDesignadaId: z.string({ required_error: "Selecciona una persona de contacto" }).uuid(),
  modalidad: z.enum(["presencial", "telefonica", "videollamada"], {
    required_error: "Selecciona la modalidad",
  }),
  fechaPropuesta: fechaFuturaSchema,
  notas: z
    .string()
    .max(500, "Las notas no pueden superar 500 caracteres")
    .optional(),
});

export type SolicitarCitaFormValues = z.infer<typeof solicitarCitaSchema>;

// --- Mensaje interno ---

export const mensajeInternoSchema = z.object({
  contenido: z
    .string({ required_error: "Escribe un mensaje" })
    .min(1, "El mensaje no puede estar vacío")
    .max(3000, "El mensaje no puede superar 3.000 caracteres"),
});

export type MensajeInternoFormValues = z.infer<typeof mensajeInternoSchema>;
