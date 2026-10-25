import type { ZodType } from "zod";
import { BadRequestError } from "../utils/errors";
import { idParamSchema } from "../validators/invoice.validator";

export function parseId(raw: string): number {
  return idParamSchema.parse(raw);
}

export function parseQuery<T>(schema: ZodType<T>, request: Request): T {
  return schema.parse(Object.fromEntries(new URL(request.url).searchParams));
}

export async function parseBody<T>(schema: ZodType<T>, request: Request): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new BadRequestError("El cuerpo debe ser JSON válido");
  }
  return schema.parse(json);
}
