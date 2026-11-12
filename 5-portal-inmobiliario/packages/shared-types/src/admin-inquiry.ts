import { z } from "zod";

export const ADMIN_INQUIRIES_PAGE_SIZE = 10;

/** Consulta tal como la ve un ADMIN: propiedad, usuario (si tenía sesión), contacto y mensaje. */
export type AdminInquiryDto = {
  id: string;
  createdAt: string;
  message: string;
  name: string;
  email: string;
  phone: string | null;
  propertyId: string;
  propertyTitle: string;
  /** La propiedad fue eliminada (borrado lógico): no tiene página de edición. */
  propertyDeleted: boolean;
  /** Nulos si la consulta la envió un visitante sin sesión. */
  userId: string | null;
  userName: string | null;
};

/** Parámetros de GET /api/admin/inquiries. */
export const adminInquiryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(ADMIN_INQUIRIES_PAGE_SIZE),
  search: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  propertyId: z
    .string()
    .trim()
    .max(100)
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
});
export type AdminInquiryListQuery = z.output<typeof adminInquiryListQuerySchema>;
