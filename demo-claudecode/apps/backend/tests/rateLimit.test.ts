import { describe, expect, it, vi } from "vitest";
import { RateLimiter, bucketKey, classify, clientKey, trustedProxyHops } from "../src/utils/rateLimit";

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

  it("hops=0 (por defecto) ignora X-Forwarded-For y X-Real-IP: rotarlos no cambia la clave", () => {
    const a = new Headers({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "9.9.9.9" });
    const b = new Headers({ "x-forwarded-for": "2.2.2.2", "x-real-ip": "8.8.8.8" });
    expect(clientKey(a, 0)).toBeNull();
    expect(clientKey(b, 0)).toBeNull();
    expect(bucketKey(a, false, 0)).toBe("local");
    expect(bucketKey(b, false, 0)).toBe("local");
  });

  it("hops=N toma la entrada N-ésima desde la derecha; lo que añade el cliente a la izquierda no cuenta", () => {
    const forged = new Headers({ "x-forwarded-for": "6.6.6.6, 7.7.7.7, 203.0.113.5" });
    expect(clientKey(forged, 1)).toBe("203.0.113.5");
    expect(clientKey(new Headers({ "x-forwarded-for": "6.6.6.6, 203.0.113.5, 10.0.0.1" }), 2)).toBe("203.0.113.5");
    // Rotating the forged prefix gives the same key.
    expect(clientKey(new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.5" }), 1)).toBe("203.0.113.5");
  });

  it("con hops=N y cadena corta usa X-Real-IP; sin nada, null", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "1.1.1.1", "x-real-ip": "3.3.3.3" }), 2)).toBe("3.3.3.3");
    expect(clientKey(new Headers({ "x-real-ip": "3.3.3.3" }), 1)).toBe("3.3.3.3");
    expect(clientKey(new Headers(), 1)).toBeNull();
  });

  it("trustedProxyHops: entero válido, 0 si falta o es inválido, con tope", () => {
    expect(trustedProxyHops("")).toBe(0);
    expect(trustedProxyHops("")).toBe(0);
    expect(trustedProxyHops("abc")).toBe(0);
    expect(trustedProxyHops("-1")).toBe(0);
    expect(trustedProxyHops("1.5")).toBe(0);
    expect(trustedProxyHops("2")).toBe(2);
    expect(trustedProxyHops("99")).toBe(10);
  });

  it("en producción sin IP fiable no hay cubo global: usa la credencial o ninguno", () => {
    const h = (init: Record<string, string>) => new Headers(init);
    expect(bucketKey(h({ "x-forwarded-for": "1.1.1.1" }), true, 0)).toBeNull();
    const a = bucketKey(h({ authorization: "Bearer aaa.bbb.token-a" }), true, 0);
    const b = bucketKey(h({ authorization: "Bearer aaa.bbb.token-b" }), true, 0);
    expect(a).toMatch(/^cred:/);
    expect(a).not.toBe(b);
    expect(bucketKey(h({ cookie: "x=1; refresh=abc.def.ghi" }), true, 0)).toBe("cred:abc.def.ghi");
    expect(bucketKey(h({ cookie: "x=1; __Secure-refresh=abc.def.ghi" }), true, 0)).toBe("cred:abc.def.ghi");
    expect(bucketKey(h({ "x-forwarded-for": "5.5.5.5" }), true, 0)).toBeNull();
  });

  it("con proxy de confianza la clave es la IP", () => {
    expect(bucketKey(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }), true, 1)).toBe("ip:2.2.2.2");
  });
});

describe("RateLimiter: memoria acotada", () => {
  const size = (rl: RateLimiter) => (rl as unknown as { buckets: Map<string, unknown> }).buckets.size;

  it("nunca supera maxKeys y expulsa el cubo más antiguo", () => {
    const rl = new RateLimiter(60_000, () => 0, 3);
    for (const k of ["a", "b", "c", "d", "e"]) rl.hit(k, 1);
    expect(size(rl)).toBe(3);
    // "a" and "b" were evicted: they start fresh; "e" is still counted.
    expect(rl.hit("e", 1).allowed).toBe(false);
    expect(rl.hit("a", 1).allowed).toBe(true);
    expect(size(rl)).toBe(3);
  });

  it("no recorre el mapa en cada petición: el barrido ocurre como mucho una vez por ventana", () => {
    let t = 0;
    const rl = new RateLimiter(1000, () => t, 100);
    rl.hit("old", 5);
    t = 1000; // "old" expired, first sweep is due
    rl.hit("x", 5);
    expect(size(rl)).toBe(1);
    rl.hit("y", 5);
    t = 1500;
    const spy = vi.spyOn(Map.prototype, "entries");
    rl.hit("z", 5);
    rl.hit("w", 5);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("una clave de ventana vencida se reinicia", () => {
    let t = 0;
    const rl = new RateLimiter(1000, () => t, 2);
    rl.hit("a", 1);
    expect(rl.hit("a", 1).allowed).toBe(false);
    t = 1001;
    expect(rl.hit("a", 1).allowed).toBe(true);
    expect(size(rl)).toBe(1);
  });
});
