import { describe, expect, it } from "vitest";
import { describeAdminMutation } from "./describe-admin-mutation";

describe("describeAdminMutation", () => {
  it.each([
    [
      "POST",
      "/api/admin/properties",
      { id: "p1", title: "Casa" },
      "PROPERTY_CREATED",
      "property",
      "p1",
    ],
    ["PUT", "/api/admin/properties/p1", { title: "Casa" }, "PROPERTY_UPDATED", "property", "p1"],
    ["DELETE", "/api/admin/properties/p1", null, "PROPERTY_DELETED", "property", "p1"],
    ["POST", "/api/admin/properties/p1/images", { id: "i1" }, "IMAGE_UPLOADED", "property", "p1"],
    ["PUT", "/api/admin/properties/p1/images", [], "IMAGES_REORDERED", "property", "p1"],
    ["PATCH", "/api/admin/properties/p1/images/i1", {}, "IMAGE_UPDATED", "image", "i1"],
    ["DELETE", "/api/admin/properties/p1/images/i1", null, "IMAGE_DELETED", "image", "i1"],
    ["PUT", "/api/admin/properties/p1/features", [], "PROPERTY_FEATURES_SET", "property", "p1"],
    [
      "POST",
      "/api/admin/features",
      { id: "f1", name: "Piscina" },
      "FEATURE_CREATED",
      "feature",
      "f1",
    ],
    [
      "POST",
      "/api/admin/users",
      { id: "u1", name: "Ana", role: "USER" },
      "USER_CREATED",
      "user",
      "u1",
    ],
    ["PATCH", "/api/admin/users/u1", { name: "Ana", role: "ADMIN" }, "USER_UPDATED", "user", "u1"],
    ["PUT", "/api/admin/settings", {}, "SETTINGS_UPDATED", "settings", undefined],
  ])("%s %s → %s", (method, path, body, action, entityType, entityId) => {
    expect(describeAdminMutation(method, path, body)).toMatchObject({
      action,
      entityType,
      ...(entityId !== undefined && { entityId }),
    });
  });

  it("incluye el título, el nombre y el estado en el resumen", () => {
    expect(
      describeAdminMutation("POST", "/api/admin/properties", { title: "Casa Roma" })?.summary,
    ).toBe("Creó la propiedad «Casa Roma»");
    expect(describeAdminMutation("POST", "/api/admin/features", { name: "Piscina" })?.summary).toBe(
      "Creó la característica «Piscina»",
    );
    expect(
      describeAdminMutation("PATCH", "/api/admin/users/u1", {
        name: "Ana",
        role: "ADMIN",
        isActive: false,
      })?.summary,
    ).toBe("Actualizó la cuenta de Ana (administrador, desactivada)");
  });

  it("no incluye contraseñas ni correos aunque vengan en la respuesta", () => {
    const description = describeAdminMutation("POST", "/api/admin/users", {
      id: "u1",
      name: "Ana",
      email: "ana@portal.mx",
      passwordHash: "secreto",
      role: "USER",
    });
    expect(JSON.stringify(description)).not.toMatch(/secreto|ana@portal\.mx/);
  });

  it("devuelve un resumen razonable sin cuerpo de respuesta", () => {
    expect(describeAdminMutation("POST", "/api/admin/properties", null)?.summary).toBe(
      "Creó la propiedad nueva",
    );
  });

  it.each([
    ["GET", "/api/admin/properties"],
    ["GET", "/api/admin/users/u1"],
    ["POST", "/api/admin/otra-cosa"],
    ["PUT", "/api/admin/properties/p1/otra"],
  ])("no audita %s %s", (method, path) => {
    expect(describeAdminMutation(method, path, {})).toBeNull();
  });
});
