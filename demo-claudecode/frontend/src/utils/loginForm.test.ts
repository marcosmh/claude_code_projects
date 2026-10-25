import { describe, expect, it } from "vitest";
import { loginSchema, safeReturnPath } from "./loginForm";

describe("loginSchema", () => {
  it("acepta credenciales bien formadas y recorta el email", () => {
    expect(loginSchema.parse({ email: " ana@example.com ", password: "x" })).toEqual({ email: "ana@example.com", password: "x" });
  });

  it.each([
    [{ email: "", password: "x" }, "Escribe tu email"],
    [{ email: "no-es-email", password: "x" }, "Escribe un email válido"],
    [{ email: "ana@example.com", password: "" }, "Escribe tu contraseña"],
  ])("rechaza %j", (input, message) => {
    const result = loginSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe("safeReturnPath", () => {
  it("acepta rutas internas", () => {
    expect(safeReturnPath("/invoices?status=SENT")).toBe("/invoices?status=SENT");
  });

  it.each([undefined, null, 5, "", "invoices", "//evil.com", "/\\evil.com", "https://evil.com", "/login"])(
    "usa la ruta por defecto para %j",
    (value) => {
      expect(safeReturnPath(value)).toBe("/dashboard");
    },
  );
});
