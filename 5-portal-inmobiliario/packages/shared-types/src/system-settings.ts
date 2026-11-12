import { z } from "zod";

/** Texto opcional: "" o solo espacios equivalen a «sin valor» (null). */
const optionalContact = (rule: z.ZodType<string>) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() || null : value),
    z.union([z.null(), rule]),
  );

/**
 * Configuración del sistema (spec §59). Es la forma pública (GET /api/settings) y también el
 * cuerpo de PUT /api/admin/settings: ninguno de estos ajustes es secreto.
 */
export const systemSettingsSchema = z.object({
  allowRegistration: z.boolean({ error: "Indica si se permite el registro de cuentas" }),
  defaultCurrency: z.enum(["MXN", "USD"], { error: "Moneda no válida" }),
  contactEmail: optionalContact(
    z.email("Ingresa un email válido").max(254, "Máximo 254 caracteres"),
  ),
  contactPhone: optionalContact(
    z
      .string()
      .min(7, "El teléfono debe tener al menos 7 caracteres")
      .max(20, "El teléfono admite como máximo 20 caracteres")
      .regex(/^[0-9+\-() ]+$/, "Usa solo dígitos, espacios y + - ( )"),
  ),
});

export type SystemSettingsDto = z.output<typeof systemSettingsSchema>;
export type UpdateSystemSettingsInput = z.input<typeof systemSettingsSchema>;

/** Valores de una instalación nueva. */
export const defaultSystemSettings: SystemSettingsDto = {
  allowRegistration: true,
  defaultCurrency: "MXN",
  contactEmail: null,
  contactPhone: null,
};
