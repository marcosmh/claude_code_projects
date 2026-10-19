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
