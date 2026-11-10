import { z } from "zod";

export type UserRole = "USER" | "ADMIN";

// ADMIN puede hacer todo lo que hace USER (spec, sección 2): un rol mayor incluye a los menores.
const roleRank: Record<UserRole, number> = { USER: 1, ADMIN: 2 };

/** true si `userRole` alcanza el nivel de `requiredRole` (ADMIN incluye USER). */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleRank[userRole] >= roleRank[requiredRole];
}

const emailSchema = z
  .string()
  .trim()
  .max(254, "Máximo 254 caracteres")
  .email("Ingresa un email válido")
  .transform((value) => value.toLowerCase());

/** Registro público: el rol nunca se recibe del cliente, siempre se crea como USER. */
export const registerInputSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre").max(100, "Máximo 100 caracteres"),
  email: emailSchema,
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128, "Máximo 128 caracteres"),
});

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresa tu contraseña").max(128, "Máximo 128 caracteres"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;

/** Usuario autenticado tal como lo expone la API (nunca incluye el hash de la contraseña). */
export type AuthUserDto = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};
