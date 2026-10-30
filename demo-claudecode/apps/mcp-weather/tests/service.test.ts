import { describe, expect, it } from "vitest";
import { TtlCache } from "../src/services/ttlCache.js";
import { WeatherService } from "../src/services/WeatherService.js";
import { FakeProvider, report } from "./helpers.js";

describe("TtlCache", () => {
  it("reutiliza el valor hasta que vence", async () => {
    let now = 0;
    let loads = 0;
    const cache = new TtlCache<number>(1000, () => now);
    const load = async () => ++loads;
    expect(await cache.getOrLoad("a", load)).toBe(1);
    now = 999;
    expect(await cache.getOrLoad("a", load)).toBe(1);
    now = 1000;
    expect(await cache.getOrLoad("a", load)).toBe(2);
  });

  it("no cachea los fallos", async () => {
    const cache = new TtlCache<number>(1000);
    await expect(cache.getOrLoad("a", async () => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(await cache.getOrLoad("a", async () => 7)).toBe(7);
  });

  it("descarta la entrada más antigua al llenarse", async () => {
    const cache = new TtlCache<string>(1000, () => 0, 2);
    await cache.getOrLoad("a", async () => "a1");
    await cache.getOrLoad("b", async () => "b1");
    await cache.getOrLoad("c", async () => "c1");
    expect(await cache.getOrLoad("b", async () => "b2")).toBe("b1");
    expect(await cache.getOrLoad("a", async () => "a2")).toBe("a2");
  });
});

describe("WeatherService", () => {
  it("cachea geocodificación y pronóstico, sin distinguir mayúsculas ni espacios", async () => {
    const provider = new FakeProvider();
    const service = new WeatherService(provider);
    await service.getReport("Oaxaca", "mx");
    await service.getReport("  oaxaca ", "MX");
    expect(provider.geocodeCalls).toBe(1);
    expect(provider.forecastCalls).toBe(1);
  });

  it("vuelve a pedir el pronóstico a los 10 minutos pero no la ubicación", async () => {
    let now = 0;
    const provider = new FakeProvider(report());
    const service = new WeatherService(provider, () => now);
    await service.getReport("Oaxaca");
    now = 10 * 60_000;
    await service.getReport("Oaxaca");
    expect(provider.geocodeCalls).toBe(1);
    expect(provider.forecastCalls).toBe(2);
    now = 60 * 60_000;
    await service.getReport("Oaxaca");
    expect(provider.geocodeCalls).toBe(2);
  });
});
