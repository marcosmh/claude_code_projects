import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Escribe tu email").pipe(z.email("Escribe un email válido")),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export type LoginValues = z.infer<typeof loginSchema>;

/** Ruta a la que volver tras iniciar sesión; solo rutas internas (evita redirecciones a otros sitios). */
export function safeReturnPath(from: unknown, fallback = "/dashboard"): string {
  return typeof from === "string" && /^\/(?![/\\])/.test(from) && !from.startsWith("/login") ? from : fallback;
}
