import { describe, expect, it } from "vitest";
import { hasRole, loginInputSchema, registerInputSchema, updateProfileInputSchema } from "./auth";

const validRegistration = {
  name: "Ana Pérez",
  email: "ana@example.com",
  password: "clave-segura-1",
};

describe("registerInputSchema", () => {
  it("acepta datos válidos y normaliza el email a minúsculas", () => {
    const result = registerInputSchema.parse({
      ...validRegistration,
      name: "  Ana Pérez ",
      email: "  Ana@Example.COM ",
    });
    expect(result).toEqual({
      name: "Ana Pérez",
      email: "ana@example.com",
      password: "clave-segura-1",
    });
  });

  it("rechaza contraseñas cortas y largas", () => {
    expect(registerInputSchema.safeParse({ ...validRegistration, password: "corta" }).success).toBe(
      false,
    );
    expect(
      registerInputSchema.safeParse({ ...validRegistration, password: "a".repeat(129) }).success,
    ).toBe(false);
  });

  it("rechaza nombre corto y email inválido", () => {
    const result = registerInputSchema.safeParse({
      name: "A",
      email: "x",
      password: "clave-segura-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0]).sort()).toEqual(["email", "name"]);
    }
  });

  it("descarta campos desconocidos como role para impedir escalada de privilegios", () => {
    const result = registerInputSchema.parse({ ...validRegistration, role: "ADMIN" });
    expect(result).not.toHaveProperty("role");
  });
});

describe("loginInputSchema", () => {
  it("acepta email y contraseña y normaliza el email", () => {
    expect(loginInputSchema.parse({ email: "ANA@example.com", password: "x" })).toEqual({
      email: "ana@example.com",
      password: "x",
    });
  });

  it("rechaza contraseña vacía y email inválido", () => {
    expect(loginInputSchema.safeParse({ email: "ana@example.com", password: "" }).success).toBe(
      false,
    );
    expect(loginInputSchema.safeParse({ email: "no-es-email", password: "x" }).success).toBe(false);
  });
});

describe("hasRole", () => {
  it("ADMIN incluye los permisos de USER, pero USER no incluye los de ADMIN", () => {
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "USER")).toBe(true);
    expect(hasRole("USER", "USER")).toBe(true);
    expect(hasRole("USER", "ADMIN")).toBe(false);
  });
});

describe("updateProfileInputSchema", () => {
  const base = { name: "  Ana Pérez ", email: " ANA@Example.com " };

  it("normaliza nombre y email y trata las contraseñas vacías como ausentes", () => {
    const result = updateProfileInputSchema.parse({
      ...base,
      currentPassword: "",
      newPassword: "",
    });
    expect(result).toEqual({
      name: "Ana Pérez",
      email: "ana@example.com",
      currentPassword: undefined,
      newPassword: undefined,
    });
  });

  it("acepta cambiar la contraseña indicando la actual", () => {
    const result = updateProfileInputSchema.parse({
      ...base,
      currentPassword: "clave-vieja-1",
      newPassword: "clave-nueva-1",
    });
    expect(result.newPassword).toBe("clave-nueva-1");
  });

  it("exige la contraseña actual para fijar una nueva", () => {
    const result = updateProfileInputSchema.safeParse({ ...base, newPassword: "clave-nueva-1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["currentPassword"]);
  });

  it("rechaza una contraseña nueva corta, nombre corto y email inválido", () => {
    const result = updateProfileInputSchema.safeParse({
      name: "A",
      email: "x",
      currentPassword: "clave-vieja-1",
      newPassword: "corta",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0]).sort()).toEqual([
        "email",
        "name",
        "newPassword",
      ]);
    }
  });

  it("descarta role e isActive para impedir escalada de privilegios", () => {
    const result = updateProfileInputSchema.parse({ ...base, role: "ADMIN", isActive: false });
    expect(result).not.toHaveProperty("role");
    expect(result).not.toHaveProperty("isActive");
  });
});
