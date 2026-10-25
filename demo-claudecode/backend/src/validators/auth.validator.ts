import { z } from "zod";

export const AUTH_LIMITS = { email: 254, passwordMin: 12, passwordMax: 200 } as const;

const email = z
  .string("El email es obligatorio")
  .trim()
  .toLowerCase()
  .max(AUTH_LIMITS.email, `Máximo ${AUTH_LIMITS.email} caracteres`)
  .pipe(z.email("Email inválido"));

/** Login does not enforce the password policy: it only bounds the size (scrypt cost grows with input). */
export const loginBodySchema = z.object({
  email,
  password: z
    .string("La contraseña es obligatoria")
    .min(1, "La contraseña es obligatoria")
    .max(AUTH_LIMITS.passwordMax, `Máximo ${AUTH_LIMITS.passwordMax} caracteres`),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string("Escribe tu contraseña actual")
    .min(1, "Escribe tu contraseña actual")
    .max(AUTH_LIMITS.passwordMax, `Máximo ${AUTH_LIMITS.passwordMax} caracteres`),
  newPassword: z
    .string("Escribe la nueva contraseña")
    .min(AUTH_LIMITS.passwordMin, `La contraseña debe tener al menos ${AUTH_LIMITS.passwordMin} caracteres`)
    .max(AUTH_LIMITS.passwordMax, `Máximo ${AUTH_LIMITS.passwordMax} caracteres`),
});

/** Used when an account is created (npm run user:create). */
export const newUserSchema = z.object({
  email,
  password: z
    .string("La contraseña es obligatoria")
    .min(AUTH_LIMITS.passwordMin, `La contraseña debe tener al menos ${AUTH_LIMITS.passwordMin} caracteres`)
    .max(AUTH_LIMITS.passwordMax, `Máximo ${AUTH_LIMITS.passwordMax} caracteres`),
});
