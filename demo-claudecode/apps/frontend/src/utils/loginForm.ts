import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Escribe tu email").pipe(z.email("Escribe un email válido")),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Escribe tu contraseña actual"),
    newPassword: z.string().min(12, "Usa al menos 12 caracteres").max(200, "Máximo 200 caracteres"),
    confirm: z.string().min(1, "Repite la nueva contraseña"),
  })
  .refine((v) => v.confirm === "" || v.newPassword === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });

export type PasswordValues = z.infer<typeof passwordSchema>;

/** Ruta a la que volver tras iniciar sesión; solo rutas internas (evita redirecciones a otros sitios). */
export function safeReturnPath(from: unknown, fallback = "/dashboard"): string {
  return typeof from === "string" && /^\/(?![/\\])/.test(from) && !from.startsWith("/login") ? from : fallback;
}
