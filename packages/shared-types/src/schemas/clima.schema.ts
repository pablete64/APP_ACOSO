import { z } from "zod";

// Respuesta a una pregunta de clima (Likert 1-5, 1-7 o binaria 0/1)
const respuestaPreguntaSchema = z.record(
  z.string(),    // preguntaId
  z.number().int().min(0).max(7)
);

export const respuestaClimaSchema = z.object({
  encuestaId: z.string({ required_error: "Encuesta no identificada" }).uuid(),
  departamento: z
    .string({ required_error: "Selecciona tu departamento" })
    .min(1, "Selecciona tu departamento"),
  respuestas: respuestaPreguntaSchema,
});

export type RespuestaClimaFormValues = z.infer<typeof respuestaClimaSchema>;
