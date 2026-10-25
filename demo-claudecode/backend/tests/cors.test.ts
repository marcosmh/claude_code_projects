import { describe, expect, it } from "vitest";
import { allowedOrigins, corsHeaders } from "../src/utils/cors";

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
});
