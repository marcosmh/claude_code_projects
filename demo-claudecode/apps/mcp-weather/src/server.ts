import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OpenMeteoProvider } from "./providers/OpenMeteoProvider.js";
import { WeatherService } from "./services/WeatherService.js";
import { getWeather, getWeatherInput } from "./tools/getWeather.js";
import { recommendClothing, recommendClothingInput } from "./tools/recommendClothing.js";

export const SERVER_NAME = "mcp-weather";
export const SERVER_VERSION = "0.1.0";

/** Both tools only read public weather data; they change nothing and talk to one external service. */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export function createServer(service: WeatherService = new WeatherService(new OpenMeteoProvider())): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "get_weather",
    {
      title: "Clima y hora local de una ciudad",
      description:
        "Devuelve la hora local y el clima actual de una ciudad (temperatura, sensación térmica, humedad, viento, lluvia, UV y el rango de hoy). " +
        "Usa el código de país (MX, ES, US...) si el nombre es ambiguo.",
      inputSchema: getWeatherInput,
      annotations: { title: "Clima y hora local", ...READ_ONLY },
    },
    (input) => getWeather(service, input),
  );

  server.registerTool(
    "recommend_clothing",
    {
      title: "Recomendación de vestimenta según el clima",
      description:
        "Recomienda qué ropa, abrigo, calzado y accesorios usar hoy en una ciudad según su clima actual, " +
        "y la actividad (casual, trabajo, deporte o exterior).",
      inputSchema: recommendClothingInput,
      annotations: { title: "Qué ropa usar", ...READ_ONLY },
    },
    (input) => recommendClothing(service, input),
  );

  return server;
}
