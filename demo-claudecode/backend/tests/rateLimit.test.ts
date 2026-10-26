import { describe, expect, it } from "vitest";
import { RateLimiter, classify, clientKey } from "../src/utils/rateLimit";

describe("RateLimiter", () => {
  it("permite hasta el límite y bloquea el siguiente", () => {
    const rl = new RateLimiter(60_000, () => 0);
    const results = Array.from({ length: 4 }, () => rl.hit("a", 3));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
  });

  it("cuenta por clave y reinicia al terminar la ventana", () => {
    let t = 0;
    const rl = new RateLimiter(60_000, () => t);
    rl.hit("a", 1);
    expect(rl.hit("a", 1).allowed).toBe(false);
    expect(rl.hit("b", 1).allowed).toBe(true);
    t = 60_000;
    expect(rl.hit("a", 1).allowed).toBe(true);
  });

  it("retryAfter son los segundos que faltan, mínimo 1", () => {
    let t = 0;
    const rl = new RateLimiter(60_000, () => t);
    expect(rl.hit("a", 1).retryAfter).toBe(60);
    t = 59_999;
    expect(rl.hit("a", 1).retryAfter).toBe(1);
  });

  it("limpia las ventanas vencidas al llegar al máximo de claves", () => {
    let t = 0;
    const rl = new RateLimiter(1000, () => t, 2);
    rl.hit("a", 5);
    rl.hit("b", 5);
    t = 2000;
    rl.hit("c", 5);
    expect((rl as unknown as { buckets: Map<string, unknown> }).buckets.size).toBe(1);
  });
});

describe("classify y clientKey", () => {
  it.each([
    ["GET", "/api/v1/invoices", "read"],
    ["GET", "/api/v1/invoices/1/pdf", "pdf"],
    ["POST", "/api/v1/invoices", "write"],
    ["POST", "/api/v1/auth/login", "auth"],
    ["POST", "/api/v1/auth/password", "auth"],
    ["POST", "/api/v1/auth/logout", "write"],
    ["POST", "/api/v1/auth/refresh", "refresh"],
    ["GET", "/api/v1/auth/refresh", "read"],
    ["PATCH", "/api/v1/invoices/1/status", "write"],
    ["DELETE", "/api/v1/invoices/1", "write"],
  ])("%s %s -> %s", (method, path, expected) => {
    expect(classify(method, path)).toBe(expected);
  });

  it("usa el primer valor de X-Forwarded-For, luego X-Real-IP y por último 'local'", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("1.1.1.1");
    expect(clientKey(new Headers({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
    expect(clientKey(new Headers())).toBe("local");
  });
});
