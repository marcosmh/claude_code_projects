import type { AuditAction, AuditCategory } from "@portal/shared-types";

export const auditCategoryLabels: Record<AuditCategory, string> = {
  auth: "Acceso",
  properties: "Propiedades",
  images: "Imágenes",
  features: "Características",
  users: "Usuarios",
  settings: "Configuración",
};

export const auditActionLabels: Record<AuditAction, string> = {
  LOGIN_SUCCESS: "Inicio de sesión",
  LOGIN_FAILED: "Inicio de sesión fallido",
  LOGIN_LOCKED: "Cuenta bloqueada",
  LOGOUT: "Cierre de sesión",
  REGISTER: "Registro de cuenta",
  PROPERTY_CREATED: "Propiedad creada",
  PROPERTY_UPDATED: "Propiedad editada",
  PROPERTY_DELETED: "Propiedad eliminada",
  IMAGE_UPLOADED: "Imagen subida",
  IMAGES_REORDERED: "Imágenes reordenadas",
  IMAGE_UPDATED: "Imagen principal cambiada",
  IMAGE_DELETED: "Imagen eliminada",
  FEATURE_CREATED: "Característica creada",
  PROPERTY_FEATURES_SET: "Características asignadas",
  USER_CREATED: "Usuario creado",
  USER_UPDATED: "Usuario actualizado",
  SETTINGS_UPDATED: "Configuración guardada",
};

/** Acciones que conviene destacar a la vista de quien revisa el registro (con texto, no solo color). */
export const auditWarningActions: ReadonlySet<AuditAction> = new Set([
  "LOGIN_FAILED",
  "LOGIN_LOCKED",
  "PROPERTY_DELETED",
  "IMAGE_DELETED",
]);
