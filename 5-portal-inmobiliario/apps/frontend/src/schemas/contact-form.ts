import { inquiryInputSchema } from "@portal/shared-types";
import type { z } from "zod";

/** Campos visibles del formulario; el id de la propiedad se agrega automáticamente al enviar. */
export const contactFormSchema = inquiryInputSchema.omit({ propertyId: true });

export type ContactFormValues = z.input<typeof contactFormSchema>;
export type ContactFormData = z.output<typeof contactFormSchema>;
