import { describe, expect, it } from "vitest";
import { allowedOrigins, corsHeaders, usesRefreshCookie } from "../src/utils/cors";

describe("cors", () => {
  it("usa localhost:5173 por defecto y admite lista", () => {
    expect(allowedOrigins(undefined)).toEqual(["http://localhost:5173"]);
    expect(allowedOrigins("http://a.com/, http://b.com")).toEqual(["http://a.com", "http://b.com"]);
  });
  it("expone Retry-After y las cabeceras de rate limit al frontend", () => {
    const exposed = corsHeaders("http://localhost:5173", ["http://localhost:5173"])["Access-Control-Expose-Headers"];
    for (const h of ["Retry-After", "RateLimit-Remaining", "X-Request-Id", "Location"]) expect(exposed).toContain(h);
  });
  it("solo refleja orígenes permitidos", () => {
    expect(corsHeaders("http://localhost:5173", ["http://localhost:5173"])["Access-Control-Allow-Origin"]).toBe("http://localhost:5173");
    expect(corsHeaders("http://evil.com", ["http://localhost:5173"])).toEqual({});
    expect(corsHeaders(null, ["http://localhost:5173"])).toEqual({});
  });
  it("permite Authorization solo a los orígenes permitidos", () => {
    expect(corsHeaders("http://localhost:5173", ["http://localhost:5173"])["Access-Control-Allow-Headers"]).toMatch(/Authorization/);
    expect(corsHeaders("http://evil.com", ["http://localhost:5173"])["Access-Control-Allow-Headers"]).toBeUndefined();
  });
  it("las credenciales (cookie del refresh) solo se anuncian si se piden y el origen es permitido", () => {
    const allowed = ["http://localhost:5173"];
    expect(corsHeaders("http://localhost:5173", allowed)["Access-Control-Allow-Credentials"]).toBeUndefined();
    expect(corsHeaders("http://localhost:5173", allowed, true)["Access-Control-Allow-Credentials"]).toBe("true");
    expect(corsHeaders("http://evil.com", allowed, true)).toEqual({});
  });
  it("solo las rutas que leen o fijan la cookie del refresh usan credenciales", () => {
    for (const route of ["login", "refresh", "logout", "password"]) expect(usesRefreshCookie(`/api/v1/auth/${route}`)).toBe(true);
    for (const path of ["/api/v1/auth/me", "/api/v1/invoices", "/api/v1/stats/summary"]) expect(usesRefreshCookie(path)).toBe(false);
  });
});
