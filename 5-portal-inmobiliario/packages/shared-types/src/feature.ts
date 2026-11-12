import { z } from "zod";

/** Cuerpo de POST /api/admin/features. */
export const featureInputSchema = z.object({
  name: z
    .string({ error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(60, "Máximo 60 caracteres"),
});
export type FeatureInput = z.output<typeof featureInputSchema>;

/** Cuerpo de PUT /api/admin/properties/{id}/features: el conjunto completo de características. */
export const setPropertyFeaturesInputSchema = z.object({
  featureIds: z
    .array(z.string().min(1, "Id de característica no válido"))
    .max(100, "Máximo 100 características"),
});
export type SetPropertyFeaturesInput = z.output<typeof setPropertyFeaturesInputSchema>;
