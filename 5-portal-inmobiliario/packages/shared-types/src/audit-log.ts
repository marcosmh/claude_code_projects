import { z } from "zod";

export const AUDIT_LOG_PAGE_SIZE = 20;

/** Acciones auditables agrupadas por categoría (spec §60). */
export const auditActionsByCategory = {
  auth: ["LOGIN_SUCCESS", "LOGIN_FAILED", "LOGIN_LOCKED", "LOGOUT", "REGISTER"],
  properties: ["PROPERTY_CREATED", "PROPERTY_UPDATED", "PROPERTY_DELETED"],
  images: ["IMAGE_UPLOADED", "IMAGES_REORDERED", "IMAGE_UPDATED", "IMAGE_DELETED"],
  features: ["FEATURE_CREATED", "PROPERTY_FEATURES_SET"],
  users: ["USER_CREATED", "USER_UPDATED"],
  settings: ["SETTINGS_UPDATED"],
} as const;

export type AuditCategory = keyof typeof auditActionsByCategory;
export type AuditAction = (typeof auditActionsByCategory)[AuditCategory][number];

export const auditCategoryValues = Object.keys(auditActionsByCategory) as [
  AuditCategory,
  ...AuditCategory[],
];

export function auditCategoryOf(action: AuditAction): AuditCategory {
  const category = auditCategoryValues.find((candidate) =>
    (auditActionsByCategory[candidate] as readonly string[]).includes(action),
  );
  // Todas las acciones pertenecen a una categoría; el valor de respaldo solo satisface al tipo.
  return category ?? "settings";
}

/** Entrada del registro tal como la ve un ADMIN. */
export type AuditLogDto = {
  id: string;
  createdAt: string;
  action: AuditAction;
  category: AuditCategory;
  summary: string;
  actorId: string | null;
  actorEmail: string | null;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
};

const dateText = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Fecha no válida");

/** Parámetros de GET /api/admin/audit. Los textos vacíos equivalen a «sin filtro». */
export const auditLogListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(AUDIT_LOG_PAGE_SIZE),
    search: z
      .string()
      .trim()
      .max(100, "Máximo 100 caracteres")
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    category: z.preprocess(
      (value) => (value === "" ? undefined : value),
      z.enum(auditCategoryValues, { error: "Categoría no válida" }).optional(),
    ),
    from: z.preprocess((value) => (value === "" ? undefined : value), dateText.optional()),
    to: z.preprocess((value) => (value === "" ? undefined : value), dateText.optional()),
  })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    message: "La fecha inicial no puede ser posterior a la final",
    path: ["from"],
  });
export type AuditLogListQuery = z.output<typeof auditLogListQuerySchema>;
