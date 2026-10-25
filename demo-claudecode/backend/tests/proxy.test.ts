import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { config, proxy } from "../src/proxy";
import { LIMITS } from "../src/utils/rateLimit";

const ORIGIN = "http://localhost:5173"; // default FRONTEND_ORIGIN
let ipCounter = 0;
const freshIp = () => `10.0.0.${++ipCounter}`; // the limiter is module state: one IP per test

const req = (method: string, path: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:4000${path}`, { method, headers });

describe("proxy: CORS", () => {
  it("preflight de un origen permitido -> 204 con cabeceras CORS", () => {
    const res = proxy(req("OPTIONS", "/api/v1/invoices", { origin: ORIGIN }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(res.headers.get("access-control-allow-methods")).toContain("PATCH");
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("preflight de un origen no permitido -> 204 sin cabeceras CORS", () => {
    const res = proxy(req("OPTIONS", "/api/v1/invoices", { origin: "http://evil.com" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("GET con origen permitido añade CORS; con origen ajeno o sin origen no", () => {
    const ip = freshIp();
    const ok = proxy(req("GET", "/api/v1/invoices", { origin: ORIGIN, "x-forwarded-for": ip }));
    expect(ok.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const evil = proxy(req("GET", "/api/v1/invoices", { origin: "http://evil.com", "x-forwarded-for": ip }));
    expect(evil.headers.get("access-control-allow-origin")).toBeNull();
    const none = proxy(req("GET", "/api/v1/invoices", { "x-forwarded-for": ip }));
    expect(none.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("solo intercepta /api/*", () => {
    expect(config.matcher).toBe("/api/:path*");
  });
});

describe("proxy: rate limiting", () => {
  it("el PDF se bloquea tras su límite con 429, Retry-After y CORS", async () => {
    const headers = { origin: ORIGIN, "x-forwarded-for": freshIp() };
    for (let i = 0; i < LIMITS.pdf; i++) {
      expect(proxy(req("GET", "/api/v1/invoices/1/pdf", headers)).status).toBe(200);
    }
    const res = proxy(req("GET", "/api/v1/invoices/1/pdf", headers));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
  });

  it("los límites son independientes por clase de ruta y por IP", () => {
    const ip = freshIp();
    const h = { "x-forwarded-for": ip };
    for (let i = 0; i < LIMITS.write; i++) proxy(req("POST", "/api/v1/invoices", h));
    expect(proxy(req("POST", "/api/v1/invoices", h)).status).toBe(429);
    expect(proxy(req("GET", "/api/v1/invoices", h)).status).toBe(200);
    expect(proxy(req("POST", "/api/v1/invoices", { "x-forwarded-for": freshIp() })).status).toBe(200);
  });

  it("el preflight no consume cuota", () => {
    const h = { origin: ORIGIN, "x-forwarded-for": freshIp() };
    for (let i = 0; i < LIMITS.write + 5; i++) proxy(req("OPTIONS", "/api/v1/invoices", h));
    expect(proxy(req("POST", "/api/v1/invoices", h)).status).toBe(200);
  });

  it("informa RateLimit-Limit y RateLimit-Remaining", () => {
    const res = proxy(req("GET", "/api/v1/invoices", { "x-forwarded-for": freshIp() }));
    expect(res.headers.get("ratelimit-limit")).toBe(String(LIMITS.read));
    expect(res.headers.get("ratelimit-remaining")).toBe(String(LIMITS.read - 1));
  });
});

describe("proxy: RATE_LIMIT_DISABLED (solo E2E)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const loadProxy = async () => (await import("../src/proxy")).proxy;

  it("con RATE_LIMIT_DISABLED=1 no limita pero mantiene CORS", async () => {
    vi.stubEnv("RATE_LIMIT_DISABLED", "1");
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const p = await loadProxy();
    const headers = { origin: ORIGIN, "x-forwarded-for": freshIp() };
    for (let i = 0; i < LIMITS.write + 5; i++) expect(p(req("POST", "/api/v1/invoices", headers)).status).toBe(200);
    expect(p(req("POST", "/api/v1/invoices", headers)).headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("en producción se ignora", async () => {
    vi.stubEnv("RATE_LIMIT_DISABLED", "1");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const p = await loadProxy();
    const headers = { "x-forwarded-for": freshIp() };
    for (let i = 0; i < LIMITS.write; i++) p(req("POST", "/api/v1/invoices", headers));
    expect(p(req("POST", "/api/v1/invoices", headers)).status).toBe(429);
  });
});
