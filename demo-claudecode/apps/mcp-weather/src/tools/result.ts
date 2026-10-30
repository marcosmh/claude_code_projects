import { CityNotFoundError, WeatherUnavailableError } from "../domain/types.js";

export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export const textResult = (text: string, structured: Record<string, unknown>): ToolResult => ({
  content: [{ type: "text", text }],
  structuredContent: structured,
});

/**
 * Turns a failure into a tool error the model can read. Only the errors we raise ourselves carry their message to the
 * client; anything unexpected is logged to stderr (stdout belongs to the protocol) and reported generically.
 */
export function errorResult(error: unknown): ToolResult {
  const known = error instanceof CityNotFoundError || error instanceof WeatherUnavailableError;
  if (!known) console.error("mcp-weather: error inesperado", error);
  const message = known ? error.message : "Ocurrió un error inesperado al consultar el clima";
  return { content: [{ type: "text", text: message }], isError: true };
}
