import { z } from "zod";
import { AUTH_LIMITS } from "@invoices/shared-validation";

export { AUTH_LIMITS };

const email = z
  .string("El email es obligatorio")
  .trim()
  .toLowerCase()
  .max(AUTH_LIMITS.email, `Máximo ${AUTH_LIMITS.email} caracteres`)
  .pipe(z.email("Email inválido"));

/**
 * `mode: "token"` is for scripts (curl, Postman, REST Client): the response body then also carries the access
 * token for `Authorization: Bearer`. Without it the token travels only in its httpOnly cookie.
 */
const sessionMode = z.literal("token", "El modo debe ser \"token\"").optional();

/** POST /auth/refresh has no required body: the schema only exists to read the optional `mode`. */
export const refreshBodySchema = z.object({ mode: sessionMode });

/** Login does not enforce the password policy: it only bounds the size (scrypt cost grows with input). */
export const loginBodySchema = z.object({
  mode: sessionMode,
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

export const roleSchema = z.enum(["USER", "ADMIN"], "El rol debe ser USER o ADMIN");

/** Used when an account is created (npm run user:create). */
export const newUserSchema = z.object({
  email,
  password: z
    .string("La contraseña es obligatoria")
    .min(AUTH_LIMITS.passwordMin, `La contraseña debe tener al menos ${AUTH_LIMITS.passwordMin} caracteres`)
    .max(AUTH_LIMITS.passwordMax, `Máximo ${AUTH_LIMITS.passwordMax} caracteres`),
  role: roleSchema.default("USER"),
});
