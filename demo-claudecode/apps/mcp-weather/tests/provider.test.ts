import { describe, expect, it } from "vitest";
import { CityNotFoundError, WeatherUnavailableError } from "../src/domain/types.js";
import { OpenMeteoProvider } from "../src/providers/OpenMeteoProvider.js";
import { oaxaca } from "./helpers.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const providerWith = (handler: (url: URL) => Response | Promise<Response>, timeoutMs?: number) =>
  new OpenMeteoProvider(async (input) => handler(input as URL), timeoutMs);

const geo = (name: string, code: string, extra = {}) => ({
  name,
  latitude: 1,
  longitude: 2,
  timezone: "UTC",
  country: `País ${code}`,
  country_code: code,
  ...extra,
});

const forecastBody = {
  utc_offset_seconds: -21600,
  current: {
    time: "2026-10-29T15:00",
    temperature_2m: 23.4,
    apparent_temperature: 24,
    relative_humidity_2m: 50,
    precipitation: 0,
    weather_code: 1,
    wind_speed_10m: 8,
    wind_gusts_10m: 12,
    is_day: 1,
  },
  daily: { temperature_2m_max: [27], temperature_2m_min: [15], precipitation_probability_max: [10], uv_index_max: [7] },
};

describe("OpenMeteoProvider.geocode", () => {
  it("devuelve la primera coincidencia y pide varios candidatos en español", async () => {
    let seen!: URL;
    const p = providerWith((url) => {
      seen = url;
      return json({ results: [geo("Oaxaca", "MX", { admin1: "Oaxaca" }), geo("Oaxaca", "US")] });
    });
    const loc = await p.geocode("Oaxaca");
    expect(loc).toMatchObject({ name: "Oaxaca", countryCode: "MX", region: "Oaxaca", timezone: "UTC" });
    expect(seen.hostname).toBe("geocoding-api.open-meteo.com");
    expect(seen.searchParams.get("name")).toBe("Oaxaca");
    expect(seen.searchParams.get("count")).toBe("10");
    expect(seen.searchParams.get("language")).toBe("es");
  });

  it("entre homónimos elige el más poblado y respeta el orden si no hay población", async () => {
    const big = providerWith(() => json({ results: [geo("Villa", "MX", { population: 2203 }), geo("Villa", "MX", { population: 1_500_000, admin1: "Grande" })] }));
    expect((await big.geocode("Villa")).region).toBe("Grande");
    const none = providerWith(() => json({ results: [geo("Villa", "MX", { admin1: "Primero" }), geo("Villa", "MX", { admin1: "Segundo" })] }));
    expect((await none.geocode("Villa")).region).toBe("Primero");
  });

  it("filtra por país entre los candidatos", async () => {
    const p = providerWith(() => json({ results: [geo("Santiago", "CL"), geo("Santiago", "ES")] }));
    expect((await p.geocode("Santiago", "es")).countryCode).toBe("ES");
  });

  it("ciudad sin resultados o país sin coincidencia -> CityNotFoundError", async () => {
    await expect(providerWith(() => json({})).geocode("Xyzzy")).rejects.toBeInstanceOf(CityNotFoundError);
    await expect(providerWith(() => json({ results: [geo("A", "MX")] })).geocode("A", "FR")).rejects.toThrow(/A \(FR\)/);
  });

  it("usa el código de país si falta el nombre", async () => {
    const p = providerWith(() => json({ results: [{ name: "X", latitude: 1, longitude: 2, timezone: "UTC", country_code: "ZZ" }] }));
    expect((await p.geocode("X")).country).toBe("ZZ");
  });
});

describe("OpenMeteoProvider.forecast", () => {
  it("mapea la respuesta y pide la zona horaria automática", async () => {
    let seen!: URL;
    const p = providerWith((url) => {
      seen = url;
      return json(forecastBody);
    });
    const r = await p.forecast(oaxaca);
    expect(r).toMatchObject({
      localTime: "2026-10-29T15:00",
      utcOffsetSeconds: -21600,
      isDay: true,
      temperatureC: 23.4,
      feelsLikeC: 24,
      todayMinC: 15,
      todayMaxC: 27,
      precipitationProbability: 10,
      uvIndexMax: 7,
    });
    expect(r.location).toBe(oaxaca);
    expect(seen.searchParams.get("timezone")).toBe("auto");
    expect(seen.searchParams.get("forecast_days")).toBe("1");
    expect(seen.searchParams.get("latitude")).toBe(String(oaxaca.latitude));
  });

  it("valores diarios nulos caen a la temperatura actual / cero", async () => {
    const body = { ...forecastBody, daily: { temperature_2m_max: [null], temperature_2m_min: [null], precipitation_probability_max: [null], uv_index_max: [null] } };
    const r = await providerWith(() => json(body)).forecast(oaxaca);
    expect(r).toMatchObject({ todayMinC: 23.4, todayMaxC: 23.4, precipitationProbability: 0, uvIndexMax: 0 });
  });
});

describe("OpenMeteoProvider errors", () => {
  it("HTTP no 2xx", async () => {
    await expect(providerWith(() => json({}, 503)).forecast(oaxaca)).rejects.toThrow(/503/);
    await expect(providerWith(() => json({}, 429)).geocode("x")).rejects.toBeInstanceOf(WeatherUnavailableError);
  });

  it("respuesta con forma inesperada", async () => {
    await expect(providerWith(() => json({ current: {} })).forecast(oaxaca)).rejects.toThrow(/inesperada/);
    await expect(providerWith(() => json({ results: "no" })).geocode("x")).rejects.toThrow(/inesperada/);
  });

  it("JSON inválido y fallo de red no filtran detalles internos", async () => {
    const bad = providerWith(() => new Response("<html>", { status: 200 }));
    await expect(bad.forecast(oaxaca)).rejects.toBeInstanceOf(WeatherUnavailableError);
    const net = providerWith(() => Promise.reject(new Error("getaddrinfo ENOTFOUND secret.internal")));
    await expect(net.geocode("x")).rejects.not.toThrow(/secret/);
  });

  it("agota el tiempo de espera", async () => {
    const hang = new OpenMeteoProvider(
      (_input, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
      20,
    );
    await expect(hang.forecast(oaxaca)).rejects.toBeInstanceOf(WeatherUnavailableError);
  });
});
