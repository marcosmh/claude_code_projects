import { z } from "zod";

export const inquiryInputSchema = z.object({
  propertyId: z.string().trim().min(1, "Falta la propiedad"),
  name: z.string().trim().min(2, "Ingresa tu nombre").max(100, "Máximo 100 caracteres"),
  email: z.string().trim().max(254, "Máximo 254 caracteres").email("Ingresa un email válido"),
  phone: z
    .string()
    .trim()
    .max(20, "Máximo 20 caracteres")
    .regex(/^(\+?[\d\s()-]{7,20})?$/, "Ingresa un teléfono válido")
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  message: z
    .string()
    .trim()
    .min(10, "El mensaje debe tener al menos 10 caracteres")
    .max(2000, "Máximo 2000 caracteres"),
});

export type InquiryInput = z.infer<typeof inquiryInputSchema>;

/** Respuesta de POST /api/inquiries. La consulta queda guardada; el correo lo envía el navegador. */
export type InquiryResponseDto = {
  id: string;
};

/** Asunto del correo de aviso de una consulta; también se muestra en «Propiedades consultadas». */
export function buildInquirySubject(propertyTitle: string): string {
  return `Nueva consulta: ${propertyTitle}`;
}

/** Una consulta enviada por la persona con sesión (GET /api/inquiries/mine). */
export type UserInquiryDto = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImageUrl: string | null;
  subject: string;
  message: string;
  createdAt: string;
};

export const USER_INQUIRIES_PAGE_SIZE = 6;

/** Parámetros de GET /api/inquiries/mine: paginación y búsqueda por título o mensaje. */
export const userInquiryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(USER_INQUIRIES_PAGE_SIZE),
  q: z.string().trim().max(100, "Máximo 100 caracteres").optional(),
});

export type UserInquiryListQuery = z.infer<typeof userInquiryListQuerySchema>;
