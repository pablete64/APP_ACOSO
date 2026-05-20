import { z } from "zod";

// --- Validaciones reutilizables ---

const emailSchema = z
  .string({ required_error: "El email es obligatorio" })
  .email("Introduce un email válido")
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string({ required_error: "La contraseña es obligatoria" })
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .max(128, "La contraseña no puede superar 128 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una letra mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una letra minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial");

const mfaCodeSchema = z
  .string()
  .length(6, "El código MFA debe tener exactamente 6 dígitos")
  .regex(/^\d{6}$/, "El código MFA solo puede contener dígitos")
  .optional();

// --- Login ---

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "La contraseña es obligatoria" }).min(1),
  mfaCode: mfaCodeSchema,
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// --- Recuperación de contraseña ---

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// --- Reset de contraseña ---

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string({ required_error: "Confirma la contraseña" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// --- Cambio de contraseña (usuario autenticado) ---

export const cambiarPasswordSchema = z
  .object({
    passwordActual: z.string({ required_error: "Introduce tu contraseña actual" }).min(1),
    passwordNueva: passwordSchema,
    confirmPassword: z.string({ required_error: "Confirma la nueva contraseña" }),
  })
  .refine((data) => data.passwordNueva === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type CambiarPasswordFormValues = z.infer<typeof cambiarPasswordSchema>;
