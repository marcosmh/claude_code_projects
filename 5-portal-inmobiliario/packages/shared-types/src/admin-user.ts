import { z } from "zod";
import type { UserRole } from "./auth";

export const ADMIN_USERS_PAGE_SIZE = 10;

/** Usuario tal como lo ve un ADMIN (nunca incluye el hash de la contraseña). */
export type AdminUserDto = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  favoritesCount: number;
  inquiriesCount: number;
};

export const adminUserStatusValues = ["all", "active", "inactive"] as const;
export type AdminUserStatus = (typeof adminUserStatusValues)[number];

/** Parámetros de GET /api/admin/users. */
export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(ADMIN_USERS_PAGE_SIZE),
  search: z
    .string()
    .trim()
    .max(100, "Máximo 100 caracteres")
    .transform((value) => (value === "" ? undefined : value))
    .optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(adminUserStatusValues).default("all"),
});
export type AdminUserListQuery = z.output<typeof adminUserListQuerySchema>;

/** Cuerpo de PATCH /api/admin/users/{id}: al menos un campo. */
export const updateAdminUserInputSchema = z
  .object({
    isActive: z.boolean({ error: "isActive debe ser verdadero o falso" }).optional(),
    role: z.enum(["USER", "ADMIN"], { error: "Rol no válido" }).optional(),
  })
  .refine((input) => input.isActive !== undefined || input.role !== undefined, {
    message: "Indica isActive o role",
  });
export type UpdateAdminUserInput = z.output<typeof updateAdminUserInputSchema>;
