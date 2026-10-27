import { z } from "zod";
import type { ApiErrorDetail } from "@/types/api";
import { STATUSES, type Invoice, type InvoiceRequest } from "@/types/invoice";
import { todayInput, toDateInput } from "./format";
import { LIMITS } from "./limits";

/**
 * Esquema del formulario: los inputs son texto; aquí solo se valida forma y formato
 * (mensajes en español) y se convierte al cuerpo de la API (números, centavos).
 * Las reglas de negocio (vencimiento >= emisión, etc.) las decide el backend (422).
 */
const dateText = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

const maxText = (max: number) => `Máximo ${max} caracteres`;

const lineSchema = z.object({
  description: z.string().trim().min(1, "La descripción es obligatoria").max(LIMITS.description, maxText(LIMITS.description)),
  quantity: z
    .string()
    .trim()
    .min(1, "Indica la cantidad")
    .refine((v) => Number.isFinite(Number(v)), "La cantidad debe ser un número")
    .refine((v) => !Number.isFinite(Number(v)) || Number(v) > 0, "La cantidad debe ser mayor que 0")
    .refine((v) => !(Number(v) > LIMITS.quantity), `La cantidad no puede superar ${LIMITS.quantity}`),
  price: z
    .string()
    .trim()
    .refine((v) => v === "" || Number.isFinite(Number(v)), "El precio debe ser un número")
    .refine((v) => v === "" || !Number.isFinite(Number(v)) || Number(v) >= 0, "El precio no puede ser negativo")
    .refine((v) => v === "" || !(Number(v) > LIMITS.price), `El precio no puede superar ${LIMITS.price}`),
});

export const invoiceFormSchema = z
  .object({
    clientName: z.string().trim().min(1, "El cliente es obligatorio").max(LIMITS.clientName, maxText(LIMITS.clientName)),
    clientEmail: z.union([z.literal(""), z.email("Email inválido").max(LIMITS.clientEmail, "Email demasiado largo")]),
    clientAddress: z.string().max(LIMITS.clientAddress, maxText(LIMITS.clientAddress)),
    issueDate: dateText("Fecha de emisión inválida"),
    dueDate: dateText("Fecha de vencimiento inválida"),
    status: z.enum(STATUSES),
    taxRate: z
      .string()
      .trim()
      .refine((v) => v === "" || Number.isFinite(Number(v)), "El impuesto debe ser un número")
      .refine(
        (v) => v === "" || !Number.isFinite(Number(v)) || (Number(v) >= 0 && Number(v) <= LIMITS.taxRate),
        `El impuesto debe estar entre 0 y ${LIMITS.taxRate}`,
      ),
    notes: z.string().max(LIMITS.notes, maxText(LIMITS.notes)),
    items: z
      .array(lineSchema)
      .min(1, "Agrega al menos una línea")
      .max(LIMITS.items, `Máximo ${LIMITS.items} líneas`),
  })
  .transform(
    (v): InvoiceRequest => ({
      clientName: v.clientName,
      clientEmail: v.clientEmail || null,
      clientAddress: v.clientAddress.trim() || null,
      issueDate: v.issueDate,
      dueDate: v.dueDate,
      status: v.status,
      taxRate: Number(v.taxRate || 0),
      notes: v.notes.trim() || null,
      items: v.items.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPriceCents: Math.round(Number(l.price || 0) * 100),
      })),
    }),
  );

export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;

export const emptyInvoiceForm = (): InvoiceFormValues => ({
  clientName: "",
  clientEmail: "",
  clientAddress: "",
  issueDate: todayInput(),
  dueDate: todayInput(30),
  status: "DRAFT",
  taxRate: "0",
  notes: "",
  items: [{ description: "", quantity: "1", price: "" }],
});

export const invoiceToFormValues = (inv: Invoice): InvoiceFormValues => ({
  clientName: inv.clientName,
  clientEmail: inv.clientEmail ?? "",
  clientAddress: inv.clientAddress ?? "",
  issueDate: toDateInput(inv.issueDate),
  dueDate: toDateInput(inv.dueDate),
  status: inv.status,
  taxRate: String(inv.taxRate),
  notes: inv.notes ?? "",
  items: inv.items.map((i) => ({
    description: i.description,
    quantity: String(i.quantity),
    price: (i.unitPriceCents / 100).toFixed(2),
  })),
});

export interface MappedServerErrors {
  fields: { name: string; message: string }[];
  general: string[];
}

const TOP_FIELDS = new Set([
  "clientName",
  "clientEmail",
  "clientAddress",
  "issueDate",
  "dueDate",
  "status",
  "taxRate",
  "notes",
]);

/** Traduce `details[].field` de la API a nombres de campo del formulario (`unitPriceCents` -> `price`). */
export function mapServerErrors(details: ApiErrorDetail[], fallback: string): MappedServerErrors {
  const fields: MappedServerErrors["fields"] = [];
  const general: string[] = [];

  for (const { field, message } of details) {
    const line = field?.match(/^items\.(\d+)\.(description|quantity|unitPriceCents)$/);
    if (line) {
      fields.push({ name: `items.${line[1]}.${line[2] === "unitPriceCents" ? "price" : line[2]}`, message });
    } else if (field && TOP_FIELDS.has(field)) {
      fields.push({ name: field, message });
    } else {
      general.push(message);
    }
  }
  if (fields.length === 0 && general.length === 0) general.push(fallback);
  return { fields, general };
}
