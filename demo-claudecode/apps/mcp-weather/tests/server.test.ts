import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CityNotFoundError, WeatherUnavailableError } from "../src/domain/types.js";
import { createServer } from "../src/server.js";
import { WeatherService } from "../src/services/WeatherService.js";
import type { WeatherProvider } from "../src/services/WeatherProvider.js";
import { FakeProvider, oaxaca, report } from "./helpers.js";

async function connect(provider: WeatherProvider) {
  const server = createServer(new WeatherService(provider));
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { client, close: () => client.close() };
}

const textOf = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { type: string; text: string }[]).map((c) => c.text).join("\n");

let closer: (() => Promise<void>) | undefined;
afterEach(async () => {
  await closer?.();
  closer = undefined;
  vi.restoreAllMocks();
});

describe("mcp-weather server", () => {
  it("expone las dos herramientas como de solo lectura", async () => {
    const { client, close } = await connect(new FakeProvider());
    closer = close;
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(["get_weather", "recommend_clothing"]);
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint).toBe(true);
      expect(t.annotations?.openWorldHint).toBe(true);
    }
  });

  it("get_weather devuelve texto y datos estructurados en unidades métricas", async () => {
    const { client, close } = await connect(new FakeProvider(report({ temperatureC: 20, windKmh: 10 })));
    closer = close;
    const result = await client.callTool({ name: "get_weather", arguments: { city: "Oaxaca" } });
    expect(result.isError).toBeFalsy();
    const text = textOf(result);
    expect(text).toContain("Hora local: 2026-10-29 15:00 (UTC-06:00)");
    expect(text).toContain("Temperatura: 20 °C");
    expect(result.structuredContent).toMatchObject({
      location: { city: "Oaxaca", countryCode: "MX" },
      temperature: 20,
      wind: 10,
      units: { temperature: "°C", speed: "km/h", precipitation: "mm" },
    });
  });

  it("get_weather convierte a imperial", async () => {
    const { client, close } = await connect(new FakeProvider(report({ temperatureC: 20 })));
    closer = close;
    const result = await client.callTool({ name: "get_weather", arguments: { city: "Oaxaca", units: "imperial" } });
    expect(result.structuredContent).toMatchObject({ temperature: 68, units: { temperature: "°F" } });
  });

  it("recommend_clothing responde con ropa según el clima y la actividad", async () => {
    const { client, close } = await connect(new FakeProvider(report({ feelsLikeC: 4, temperatureC: 6 })));
    closer = close;
    const result = await client.callTool({ name: "recommend_clothing", arguments: { city: "Oaxaca", activity: "trabajo" } });
    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain("Qué ponerte en Oaxaca");
    expect(result.structuredContent).toMatchObject({ comfort: "muy frío", activity: "trabajo" });
  });

  it("rechaza entradas inválidas antes de llamar al proveedor", async () => {
    const provider = new FakeProvider();
    const { client, close } = await connect(provider);
    closer = close;
    for (const args of [{ city: "" }, { city: "a" }, { city: "x".repeat(81) }, { city: "<script>" }, { city: "Oaxaca", country: "MEX" }, { city: "Oaxaca", units: "kelvin" }]) {
      const result = await client.callTool({ name: "get_weather", arguments: args }).catch((e: unknown) => ({ isError: true, content: [{ type: "text", text: String(e) }] }));
      expect(result.isError).toBe(true);
    }
    expect(provider.geocodeCalls).toBe(0);
  });

  it("ciudad inexistente y servicio caído son errores de herramienta legibles", async () => {
    const missing: WeatherProvider = { geocode: async () => Promise.reject(new CityNotFoundError("Xyzzy")), forecast: async () => report() };
    let { client, close } = await connect(missing);
    const notFound = await client.callTool({ name: "get_weather", arguments: { city: "Xyzzy" } });
    await close();
    expect(notFound.isError).toBe(true);
    expect(textOf(notFound)).toContain("Xyzzy");

    const down: WeatherProvider = { geocode: async () => oaxaca, forecast: async () => Promise.reject(new WeatherUnavailableError()) };
    ({ client, close } = await connect(down));
    closer = close;
    const unavailable = await client.callTool({ name: "recommend_clothing", arguments: { city: "Oaxaca" } });
    expect(unavailable.isError).toBe(true);
  });

  it("un error inesperado no filtra su mensaje y se registra por stderr", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const boom: WeatherProvider = { geocode: async () => Promise.reject(new Error("postgres://user:secret@host")), forecast: async () => report() };
    const { client, close } = await connect(boom);
    closer = close;
    const result = await client.callTool({ name: "get_weather", arguments: { city: "Oaxaca" } });
    expect(result.isError).toBe(true);
    expect(textOf(result)).not.toContain("secret");
    expect(spy).toHaveBeenCalled();
  });
});
