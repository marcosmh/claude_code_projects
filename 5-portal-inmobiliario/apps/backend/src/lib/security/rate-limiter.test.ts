import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limiter";

function createClock(start = 1_000_000) {
  let current = start;
  return { now: () => current, advance: (ms: number) => (current += ms) };
}

describe("createRateLimiter", () => {
  it("bloquea al alcanzar el máximo de eventos dentro de la ventana", () => {
    const clock = createClock();
    const limiter = createRateLimiter({ maxEvents: 3, windowMs: 60_000, now: clock.now });
    for (let index = 0; index < 2; index += 1) limiter.record("a");
    expect(limiter.check("a").isBlocked).toBe(false);
    limiter.record("a");
    expect(limiter.check("a")).toEqual({ isBlocked: true, retryAfterSeconds: 60 });
  });

  it("calcula el tiempo restante y libera la clave al vencer la ventana", () => {
    const clock = createClock();
    const limiter = createRateLimiter({ maxEvents: 1, windowMs: 60_000, now: clock.now });
    limiter.record("a");
    clock.advance(45_000);
    expect(limiter.check("a").retryAfterSeconds).toBe(15);
    clock.advance(15_001);
    expect(limiter.check("a").isBlocked).toBe(false);
  });

  it("cuenta cada clave por separado y permite reiniciarla", () => {
    const limiter = createRateLimiter({ maxEvents: 1, windowMs: 60_000 });
    limiter.record("a");
    expect(limiter.check("b").isBlocked).toBe(false);
    limiter.reset("a");
    expect(limiter.check("a").isBlocked).toBe(false);
  });
});
