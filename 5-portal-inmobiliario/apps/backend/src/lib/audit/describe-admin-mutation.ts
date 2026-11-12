import type { AuditAction } from "@portal/shared-types";

export type AdminMutationDescription = {
  action: AuditAction;
  summary: string;
  entityType: string;
  entityId?: string;
};

/** Lee un campo de texto del cuerpo de la respuesta (si existe). */
function text(body: unknown, field: string): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "string" && value !== "" ? value : undefined;
}

function flag(body: unknown, field: string): boolean | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const value = (body as Record<string, unknown>)[field];
  return typeof value === "boolean" ? value : undefined;
}

const quoted = (value: string | undefined, fallback: string) =>
  value === undefined ? fallback : `«${value}»`;

/**
 * Describe una escritura exitosa de la API de administración (spec §60) a partir del método, la
 * ruta y el cuerpo de la respuesta. Devuelve null para lo que no se audita. Es una función pura:
 * nunca incluye contraseñas ni datos que no sean el nombre o el título del recurso.
 */
export function describeAdminMutation(
  method: string,
  pathname: string,
  responseBody: unknown,
): AdminMutationDescription | null {
  const segments = pathname
    .replace(/^\/api\/admin\//, "")
    .split("/")
    .filter(Boolean);
  const [collection, id, child, childId] = segments;
  const verb = method.toUpperCase();

  if (collection === "properties") {
    if (segments.length === 1 && verb === "POST") {
      return {
        action: "PROPERTY_CREATED",
        summary: `Creó la propiedad ${quoted(text(responseBody, "title"), "nueva")}`,
        entityType: "property",
        entityId: text(responseBody, "id"),
      };
    }
    if (segments.length === 2 && verb === "PUT") {
      return {
        action: "PROPERTY_UPDATED",
        summary: `Editó la propiedad ${quoted(text(responseBody, "title"), "")}`.trim(),
        entityType: "property",
        entityId: id,
      };
    }
    if (segments.length === 2 && verb === "DELETE") {
      return {
        action: "PROPERTY_DELETED",
        summary: "Eliminó una propiedad",
        entityType: "property",
        entityId: id,
      };
    }
    if (child === "images" && segments.length === 3) {
      if (verb === "POST") {
        return {
          action: "IMAGE_UPLOADED",
          summary: "Subió una imagen a una propiedad",
          entityType: "property",
          entityId: id,
        };
      }
      if (verb === "PUT") {
        return {
          action: "IMAGES_REORDERED",
          summary: "Cambió el orden de las imágenes de una propiedad",
          entityType: "property",
          entityId: id,
        };
      }
    }
    if (child === "images" && segments.length === 4) {
      if (verb === "PATCH") {
        return {
          action: "IMAGE_UPDATED",
          summary: "Cambió la imagen principal de una propiedad",
          entityType: "image",
          entityId: childId,
        };
      }
      if (verb === "DELETE") {
        return {
          action: "IMAGE_DELETED",
          summary: "Eliminó una imagen de una propiedad",
          entityType: "image",
          entityId: childId,
        };
      }
    }
    if (child === "features" && segments.length === 3 && verb === "PUT") {
      return {
        action: "PROPERTY_FEATURES_SET",
        summary: "Actualizó las características de una propiedad",
        entityType: "property",
        entityId: id,
      };
    }
    return null;
  }

  if (collection === "features" && segments.length === 1 && verb === "POST") {
    return {
      action: "FEATURE_CREATED",
      summary: `Creó la característica ${quoted(text(responseBody, "name"), "nueva")}`,
      entityType: "feature",
      entityId: text(responseBody, "id"),
    };
  }

  if (collection === "users") {
    if (segments.length === 1 && verb === "POST") {
      const role = text(responseBody, "role") === "ADMIN" ? "administrador" : "usuario";
      return {
        action: "USER_CREATED",
        summary: `Creó la cuenta de ${text(responseBody, "name") ?? "un usuario"} (${role})`,
        entityType: "user",
        entityId: text(responseBody, "id"),
      };
    }
    if (segments.length === 2 && verb === "PATCH") {
      const role = text(responseBody, "role") === "ADMIN" ? "administrador" : "usuario";
      const isActive = flag(responseBody, "isActive");
      const state = isActive === undefined ? "" : isActive ? ", activa" : ", desactivada";
      return {
        action: "USER_UPDATED",
        summary: `Actualizó la cuenta de ${text(responseBody, "name") ?? "un usuario"} (${role}${state})`,
        entityType: "user",
        entityId: id,
      };
    }
    return null;
  }

  if (collection === "settings" && segments.length === 1 && verb === "PUT") {
    return {
      action: "SETTINGS_UPDATED",
      summary: "Guardó la configuración del sistema",
      entityType: "settings",
    };
  }

  return null;
}
