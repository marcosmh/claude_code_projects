import { z } from "zod";

export const STATUSES = ["DRAFT", "SENT", "PAID"] as const;
export const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  PAID: "Pagada",
};

export const invoiceSchema = z
  .object({
    clientName: z.string().trim().min(1, "El cliente es obligatorio"),
    clientEmail: z.union([z.literal(""), z.email("Email inválido")]),
    clientAddress: z.string().trim(),
    issueDate: z.iso.date("Fecha de emisión inválida"),
    dueDate: z.iso.date("Fecha de vencimiento inválida"),
    status: z.enum(STATUSES),
    taxRate: z.number().min(0, "Impuesto inválido").max(100, "Impuesto inválido"),
    notes: z.string().trim(),
    items: z
      .array(
        z.object({
          description: z.string().trim().min(1, "La descripción es obligatoria"),
          quantity: z.number().gt(0, "La cantidad debe ser mayor que 0"),
          unitPriceCents: z.number().int().min(0, "Precio inválido"),
        }),
      )
      .min(1, "Agrega al menos una línea"),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    message: "El vencimiento no puede ser anterior a la emisión",
    path: ["dueDate"],
  });

export type InvoiceInput = z.infer<typeof invoiceSchema>;

/**
 * Esquema del formulario: recibe los valores como texto (inputs) y los convierte
 * al formato de `invoiceSchema` (números, centavos). Es la misma validación que
 * repite el servidor, así los errores se ven sin viajar a la Server Action.
 */
export const invoiceFormSchema = z
  .object({
    clientName: z.string(),
    clientEmail: z.string(),
    clientAddress: z.string(),
    issueDate: z.string(),
    dueDate: z.string(),
    status: z.string(),
    taxRate: z.string(),
    notes: z.string(),
    items: z.array(z.object({ description: z.string(), quantity: z.string(), price: z.string() })),
  })
  .transform(({ taxRate, items, ...rest }) => ({
    ...rest,
    taxRate: Number(taxRate || 0),
    items: items.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPriceCents: Math.round(Number(l.price || 0) * 100),
    })),
  }))
  .pipe(invoiceSchema);

export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;
