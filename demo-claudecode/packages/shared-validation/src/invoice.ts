import { CURRENCIES, STATUSES } from "@invoices/shared-types";
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

export const currencySchema = z.enum(CURRENCIES, { error: "Moneda inválida (MXN, USD o EUR)" });

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
  currency: currencySchema.default("USD"),
  notes: optionalText(LIMITS.notes),
  items: z
    .array(invoiceItemSchema, "Las líneas deben ser una lista")
    .max(LIMITS.items, `Máximo ${LIMITS.items} líneas`),
});

export const statusBodySchema = z.object({ status: statusSchema });

/** `status=DRAFT,SENT` (query strings carry one value per key): a de-duplicated, non-empty list. */
const statusListSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : v),
  z
    .array(statusSchema)
    .min(1, "Indique al menos un estado")
    .transform((list) => [...new Set(list)]),
);

const totalCentsFilter = (name: string) =>
  z.coerce
    .number(`${name} inválido`)
    .int(`${name} debe estar en centavos enteros`)
    .min(0, `${name} debe ser >= 0`)
    .max(Number.MAX_SAFE_INTEGER, `${name} demasiado alto`);

export const listQuerySchema = z
  .object({
  status: statusListSchema.optional(),
  search: z.string().trim().max(100).optional(),
  /** Inclusive range on the issue date (`YYYY-MM-DD`). */
  issuedFrom: z.iso.date("issuedFrom inválida (use YYYY-MM-DD)").optional(),
  issuedTo: z.iso.date("issuedTo inválida (use YYYY-MM-DD)").optional(),
  currency: currencySchema.optional(),
  /** Range on the invoice total (tax included), in cents. Needs `currency`: amounts of different currencies are never compared. */
  minTotalCents: totalCentsFilter("minTotalCents").optional(),
  maxTotalCents: totalCentsFilter("maxTotalCents").optional(),
  page: z.coerce.number().int("page inválido").min(1, "page debe ser >= 1").max(LIMITS.page, "page demasiado alto").default(1),
  pageSize: z.coerce
    .number()
    .int("pageSize inválido")
    .min(1, "pageSize debe ser >= 1")
    .max(100, "pageSize debe ser <= 100")
    .default(10),
  })
  .superRefine((q, ctx) => {
    if (q.issuedFrom && q.issuedTo && q.issuedFrom > q.issuedTo) {
      ctx.addIssue({ code: "custom", path: ["issuedTo"], message: "issuedTo no puede ser anterior a issuedFrom" });
    }
    const hasAmount = q.minTotalCents !== undefined || q.maxTotalCents !== undefined;
    if (hasAmount && !q.currency) {
      ctx.addIssue({ code: "custom", path: ["currency"], message: "currency es obligatoria para filtrar por importe" });
    }
    if (q.minTotalCents !== undefined && q.maxTotalCents !== undefined && q.minTotalCents > q.maxTotalCents) {
      ctx.addIssue({ code: "custom", path: ["maxTotalCents"], message: "maxTotalCents no puede ser menor que minTotalCents" });
    }
  });

/** Normalised request body: what the client sends and the service receives. */
export type InvoiceRequest = z.output<typeof invoiceBodySchema>;
export type InvoiceItemRequest = z.output<typeof invoiceItemSchema>;
export type StatusRequest = z.output<typeof statusBodySchema>;
export type ListInvoicesQuery = z.output<typeof listQuerySchema>;
