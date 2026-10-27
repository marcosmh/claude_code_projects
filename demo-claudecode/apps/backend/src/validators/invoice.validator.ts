import { z } from "zod";

// Request schemas and limits are shared with the frontend; only server-side parsers live here.
export {
  invoiceBodySchema,
  invoiceItemSchema,
  LIMITS,
  listQuerySchema,
  statusBodySchema,
  statusSchema,
} from "@invoices/shared-validation";

export const idParamSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "El id debe ser un entero positivo")
  .transform(Number)
  .pipe(z.number().int().safe());

export const monthlyQuerySchema = z.object({
  months: z.coerce
    .number()
    .int("months inválido")
    .min(1, "months debe ser >= 1")
    .max(24, "months debe ser <= 24")
    .default(6),
});
