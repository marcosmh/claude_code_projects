import { z } from "zod";
import { STATUSES } from "../domain/invoice";

const isoDate = (label: string) =>
  z.union([z.iso.date(), z.iso.datetime({ offset: true })], {
    error: `${label} inválida (use ISO 8601)`,
  });

// Input caps keep payloads, PDFs and line totals within safe integer range:
// 100 lines * (1e5 qty * 1e8 cents) stays below Number.MAX_SAFE_INTEGER.
export const LIMITS = {
  clientName: 200,
  clientEmail: 254,
  clientAddress: 500,
  notes: 2000,
  description: 500,
  items: 100,
  quantity: 100_000,
  unitPriceCents: 100_000_000,
  page: 100_000,
} as const;

/** "" and null both normalise to null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .nullish()
    .transform((v) => v || null);

const optionalEmail = z
  .union([z.literal(""), z.email("Email inválido")])
  .nullish()
  .transform((v) => v || null);

export const statusSchema = z.enum(STATUSES, { error: "Estado inválido (DRAFT, SENT o PAID)" });

export const invoiceItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria")
    .max(LIMITS.description, `Máximo ${LIMITS.description} caracteres`),
  quantity: z
    .number("La cantidad debe ser un número")
    .max(LIMITS.quantity, `La cantidad no puede superar ${LIMITS.quantity}`),
  unitPriceCents: z
    .number("El precio debe ser un número")
    .int("El precio debe estar en centavos enteros")
    .min(0, "Precio inválido")
    .max(LIMITS.unitPriceCents, "Precio demasiado alto"),
});

/**
 * Shape/format validation only. Business rules (items >= 1, quantity > 0,
 * dueDate >= issueDate) live in InvoiceService.
 */
export const invoiceBodySchema = z.object({
  clientName: z
    .string("El cliente es obligatorio")
    .trim()
    .min(1, "El cliente es obligatorio")
    .max(LIMITS.clientName, `Máximo ${LIMITS.clientName} caracteres`),
  clientEmail: optionalEmail,
  clientAddress: optionalText(LIMITS.clientAddress),
  issueDate: isoDate("Fecha de emisión"),
  dueDate: isoDate("Fecha de vencimiento"),
  status: statusSchema.default("DRAFT"),
  taxRate: z.number().min(0, "Impuesto inválido").max(100, "Impuesto inválido").default(0),
  notes: optionalText(LIMITS.notes),
  items: z
    .array(invoiceItemSchema, "Las líneas deben ser una lista")
    .max(LIMITS.items, `Máximo ${LIMITS.items} líneas`),
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
  page: z.coerce.number().int("page inválido").min(1, "page debe ser >= 1").max(LIMITS.page, "page demasiado alto").default(1),
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
