import { describe, expect, it } from "vitest";
import { Semaphore } from "../src/utils/semaphore";
import { scryptConcurrency } from "../src/utils/password";

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("Semaphore", () => {
  it("no ejecuta más de max tareas a la vez y las atiende por orden", async () => {
    const sem = new Semaphore(2);
    let running = 0;
    let peak = 0;
    const order: number[] = [];
    const releases: Array<() => void> = [];
    const task = (id: number) =>
      sem.run(async () => {
        running += 1;
        peak = Math.max(peak, running);
        order.push(id);
        await new Promise<void>((resolve) => releases.push(resolve));
        running -= 1;
      });
    const all = [1, 2, 3, 4, 5].map(task);
    await tick();
    expect(running).toBe(2);
    expect(order).toEqual([1, 2]);
    while (order.length < 5 || releases.length) {
      releases.shift()?.();
      await tick();
    }
    await Promise.all(all);
    expect(peak).toBe(2);
    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it("libera el hueco aunque la tarea falle", async () => {
    const sem = new Semaphore(1);
    await expect(sem.run(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(sem.run(async () => "ok")).resolves.toBe("ok");
  });

  it("rechaza un máximo inválido", () => {
    expect(() => new Semaphore(0)).toThrow(RangeError);
    expect(() => new Semaphore(1.5)).toThrow(RangeError);
  });
});

describe("scryptConcurrency", () => {
  it("usa SCRYPT_CONCURRENCY si es un entero válido y 4 en otro caso", () => {
    expect(scryptConcurrency(undefined)).toBe(4);
    expect(scryptConcurrency("2")).toBe(2);
    expect(scryptConcurrency("0")).toBe(4);
    expect(scryptConcurrency("x")).toBe(4);
    expect(scryptConcurrency("1000")).toBe(4);
  });
});
