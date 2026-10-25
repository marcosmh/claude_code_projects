import { z } from "zod";
import { STATUSES } from "../domain/invoice";

const isoDate = (label: string) =>
  z.union([z.iso.date(), z.iso.datetime({ offset: true })], {
    error: `${label} inválida (use ISO 8601)`,
  });

/** "" and null both normalise to null. */
const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((v) => v || null);

const optionalEmail = z
  .union([z.literal(""), z.email("Email inválido")])
  .nullish()
  .transform((v) => v || null);

export const statusSchema = z.enum(STATUSES, { error: "Estado inválido (DRAFT, SENT o PAID)" });

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria"),
  quantity: z.number("La cantidad debe ser un número"),
  unitPriceCents: z
    .number("El precio debe ser un número")
    .int("El precio debe estar en centavos enteros")
    .min(0, "Precio inválido"),
});

/**
 * Shape/format validation only. Business rules (items >= 1, quantity > 0,
 * dueDate >= issueDate) live in InvoiceService.
 */
export const invoiceBodySchema = z.object({
  clientName: z.string("El cliente es obligatorio").trim().min(1, "El cliente es obligatorio"),
  clientEmail: optionalEmail,
  clientAddress: optionalText,
  issueDate: isoDate("Fecha de emisión"),
  dueDate: isoDate("Fecha de vencimiento"),
  status: statusSchema.default("DRAFT"),
  taxRate: z.number().min(0, "Impuesto inválido").max(100, "Impuesto inválido").default(0),
  notes: optionalText,
  items: z.array(invoiceItemSchema, "Las líneas deben ser una lista"),
});

export const statusBodySchema = z.object({ status: statusSchema });

export const idParamSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "El id debe ser un entero positivo")
  .transform(Number)
  .pipe(z.number().int().safe());

export const listQuerySchema = z.object({
  status: statusSchema.optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int("page inválido").min(1, "page debe ser >= 1").default(1),
  pageSize: z.coerce
    .number()
    .int("pageSize inválido")
    .min(1, "pageSize debe ser >= 1")
    .max(100, "pageSize debe ser <= 100")
    .default(10),
});

export const monthlyQuerySchema = z.object({
  months: z.coerce
    .number()
    .int("months inválido")
    .min(1, "months debe ser >= 1")
    .max(24, "months debe ser <= 24")
    .default(6),
});
