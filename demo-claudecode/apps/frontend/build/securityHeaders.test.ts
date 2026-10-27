import { describe, expect, it } from "vitest";
import { securityHeaders, toHeadersFile, toNginxInclude } from "./securityHeaders";

const CSP = "default-src 'self'; frame-ancestors 'none'";

describe("securityHeaders", () => {
  it("lleva la CSP completa tal cual, con frame-ancestors", () => {
    expect(securityHeaders(CSP)["Content-Security-Policy"]).toBe(CSP);
  });

  it("incluye las cabeceras de endurecimiento básicas", () => {
    expect(Object.keys(securityHeaders(CSP))).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options", "Permissions-Policy", "Strict-Transport-Security"]),
    );
  });
});

describe("formatos de salida", () => {
  it("_headers aplica a todas las rutas", () => {
    const file = toHeadersFile(securityHeaders(CSP));
    expect(file.startsWith("/*\n  Content-Security-Policy: default-src 'self'; frame-ancestors 'none'\n")).toBe(true);
  });

  it("nginx: una directiva add_header ... always por cabecera, con las comillas escapadas", () => {
    const conf = toNginxInclude({ "X-Test": 'a"b' });
    expect(conf).toBe('add_header X-Test "a\\"b" always;\n');
    expect(toNginxInclude(securityHeaders(CSP)).trim().split("\n").every((l) => l.startsWith("add_header ") && l.endsWith(" always;"))).toBe(true);
  });
});
