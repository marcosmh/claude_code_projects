import type { ZodType } from "zod";
import { BadRequestError } from "../utils/errors";
import { idParamSchema } from "../validators/invoice.validator";

export function parseId(raw: string): number {
  return idParamSchema.parse(raw);
}

export function parseQuery<T>(schema: ZodType<T>, request: Request): T {
  return schema.parse(Object.fromEntries(new URL(request.url).searchParams));
}

/** Like `parseBody`, but an absent (empty) body is valid and parsed as `{}`; a present body must still be JSON. */
export async function parseOptionalBody<T>(schema: ZodType<T>, request: Request): Promise<T> {
  const text = await request.text();
  if (!text.trim()) return schema.parse({});
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    throw new BadRequestError("El Content-Type debe ser application/json");
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new BadRequestError("El cuerpo debe ser JSON válido");
  }
  return schema.parse(json);
}

export async function parseBody<T>(schema: ZodType<T>, request: Request): Promise<T> {
  // Without this check a cross-site "simple" request (text/plain) is parsed as JSON,
  // skips the CORS preflight and could mutate data blindly.
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\s*(;|$)/i.test(contentType)) {
    throw new BadRequestError("El Content-Type debe ser application/json");
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new BadRequestError("El cuerpo debe ser JSON válido");
  }
  return schema.parse(json);
}
