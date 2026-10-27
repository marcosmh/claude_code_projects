import { describe, expect, it } from "vitest";
import { ApiError } from "@/services/apiClient";
import { createQueryClient } from "@/queryClient";
import { errorMessage, retryDelay, shouldRetry } from "./apiErrors";

const err = (status: number, retryAfter?: number) => new ApiError(status, "X", "m", [], retryAfter);

describe("shouldRetry", () => {
  it.each([
    ["red caída (0)", err(0), true],
    ["500", err(500), true],
    ["400", err(400), false],
    ["404", err(404), false],
    ["422", err(422), false],
    ["429 con espera corta", err(429, 5), true],
    ["429 con espera de exactamente 10 s", err(429, 10), true],
    ["429 con espera larga", err(429, 60), false],
    ["429 sin Retry-After", err(429), false],
    ["error que no es ApiError", new Error("x"), true],
  ])("%s -> %s", (_name, error, expected) => {
    expect(shouldRetry(0, error)).toBe(expected);
  });

  it("nunca reintenta más de una vez", () => {
    expect(shouldRetry(1, err(500))).toBe(false);
    expect(shouldRetry(1, err(429, 1))).toBe(false);
  });
});

describe("retryDelay", () => {
  it("en un 429 espera lo que pidió el servidor (más un margen)", () => {
    expect(retryDelay(0, err(429, 5))).toBe(5250);
  });
  it("en otros errores es exponencial y acotado", () => {
    expect(retryDelay(0, err(500))).toBe(1000);
    expect(retryDelay(2, err(500))).toBe(4000);
    expect(retryDelay(20, err(500))).toBe(30_000);
  });
});

describe("errorMessage", () => {
  it("devuelve el mensaje de la API o el de reserva", () => {
    expect(errorMessage(new ApiError(429, "RATE_LIMITED", "Espera 3 s"))).toBe("Espera 3 s");
    expect(errorMessage(new Error("interno"))).toMatch(/error inesperado/);
    expect(errorMessage("x", "reserva")).toBe("reserva");
  });
});

describe("createQueryClient", () => {
  it("usa la política de reintentos solo en lecturas; las mutaciones no se reintentan", () => {
    const defaults = createQueryClient().getDefaultOptions();
    expect(defaults.queries?.retry).toBe(shouldRetry);
    expect(defaults.queries?.retryDelay).toBe(retryDelay);
    expect(defaults.mutations?.retry).toBeUndefined(); // el valor por defecto de TanStack Query es 0
  });
});
