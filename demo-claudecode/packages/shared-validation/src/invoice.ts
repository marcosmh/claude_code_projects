import { STATUSES } from "@invoices/shared-types";
import { z } from "zod";
import { LIMITS } from "./limits";

const isoDate = (label: string) =>
  z.union([z.iso.date(), z.iso.datetime({ offset: true })], {
    error: `${label} inválida (use ISO 8601)`,
  });

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
 * dueDate >= issueDate) live in the backend InvoiceService. Never a trust boundary on the client.
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
  taxRate: z.number().min(0, "Impuesto inválido").max(LIMITS.taxRate, "Impuesto inválido").default(0),
  notes: optionalText(LIMITS.notes),
  items: z
    .array(invoiceItemSchema, "Las líneas deben ser una lista")
    .max(LIMITS.items, `Máximo ${LIMITS.items} líneas`),
});

export const statusBodySchema = z.object({ status: statusSchema });

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

/** Normalised request body: what the client sends and the service receives. */
export type InvoiceRequest = z.output<typeof invoiceBodySchema>;
export type InvoiceItemRequest = z.output<typeof invoiceItemSchema>;
export type StatusRequest = z.output<typeof statusBodySchema>;
export type ListInvoicesQuery = z.output<typeof listQuerySchema>;
