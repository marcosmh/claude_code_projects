import { describe, expect, it } from "vitest";
import { config } from "@/proxy";
import {
  buildLoginPath,
  canAccessRoute,
  findRouteRule,
  resolveEntryPath,
  findRequiredRole,
  protectedRoutes,
  resolvePostLoginPath,
  sanitizeNextPath,
} from "./route-access";

describe("findRequiredRole", () => {
  it("/account exige USER y /admin exige ADMIN, con sus subrutas", () => {
    expect(findRequiredRole("/account")).toBe("USER");
    expect(findRequiredRole("/account/favorites")).toBe("USER");
    expect(findRequiredRole("/admin")).toBe("ADMIN");
    expect(findRequiredRole("/admin/properties/12/edit")).toBe("ADMIN");
  });

  it("las rutas públicas no exigen rol", () => {
    for (const pathname of ["/", "/properties", "/properties/1", "/login", "/register"]) {
      expect(findRequiredRole(pathname)).toBeNull();
    }
  });

  it("no confunde rutas que solo comparten el comienzo del nombre", () => {
    expect(findRequiredRole("/accountant")).toBeNull();
    expect(findRequiredRole("/administrators")).toBeNull();
  });
});

describe("sanitizeNextPath", () => {
  it("acepta rutas internas con query", () => {
    expect(sanitizeNextPath("/admin/properties?page=2")).toBe("/admin/properties?page=2");
  });

  it("rechaza redirecciones abiertas y valores vacíos", () => {
    for (const unsafe of [
      "https://malo.example",
      "//malo.example",
      "/\\malo.example",
      "javascript:alert(1)",
      "admin",
      "",
      null,
      undefined,
    ]) {
      expect(sanitizeNextPath(unsafe)).toBe("/");
    }
  });
});

describe("resolvePostLoginPath", () => {
  it("lleva al ADMIN al panel cuando no pidió otra ruta", () => {
    expect(resolvePostLoginPath("ADMIN", null)).toBe("/admin");
    expect(resolvePostLoginPath("ADMIN", "//malo.example")).toBe("/admin");
  });

  it("respeta la ruta pedida, también para ADMIN", () => {
    expect(resolvePostLoginPath("ADMIN", "/account")).toBe("/account");
    expect(resolvePostLoginPath("USER", "/account")).toBe("/account");
  });

  it("lleva al USER a la página principal por defecto", () => {
    expect(resolvePostLoginPath("USER", null)).toBe("/");
  });
});

describe("buildLoginPath", () => {
  it("recuerda la ruta de destino codificada", () => {
    expect(buildLoginPath("/admin?tab=1&x=2")).toBe("/login?next=%2Fadmin%3Ftab%3D1%26x%3D2");
  });

  it("sin destino o con uno inseguro va a /login a secas", () => {
    expect(buildLoginPath()).toBe("/login");
    expect(buildLoginPath("//malo.example")).toBe("/login");
  });
});

describe("matcher del proxy", () => {
  it("cubre exactamente los prefijos protegidos", () => {
    const expected = ["/", ...protectedRoutes.map(({ prefix }) => `${prefix}/:path*`)].sort();
    expect([...config.matcher].sort()).toEqual(expected);
  });
});

describe("canAccessRoute (spec §38)", () => {
  it("/account es solo de USER: un ADMIN no entra", () => {
    const rule = findRouteRule("/account/edit");
    expect(rule).not.toBeNull();
    expect(canAccessRoute("USER", rule!)).toBe(true);
    expect(canAccessRoute("ADMIN", rule!)).toBe(false);
  });

  it("/admin es de ADMIN: un USER no entra", () => {
    const rule = findRouteRule("/admin");
    expect(canAccessRoute("ADMIN", rule!)).toBe(true);
    expect(canAccessRoute("USER", rule!)).toBe(false);
  });

  it("las rutas públicas no tienen regla", () => {
    expect(findRouteRule("/properties")).toBeNull();
  });
});

describe("resolveEntryPath (spec §39)", () => {
  it("ADMIN va a /admin y el resto, incluido el visitante, a /portal", () => {
    expect(resolveEntryPath("ADMIN")).toBe("/admin");
    expect(resolveEntryPath("USER")).toBe("/portal");
    expect(resolveEntryPath(null)).toBe("/portal");
  });
});
