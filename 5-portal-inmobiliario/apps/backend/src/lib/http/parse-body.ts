import type { ZodType } from "zod";
import { errorResponse } from "./api-response";

type ParsedBody<Output> = { data: Output; response?: never } | { data?: never; response: Response };

/** Lee el JSON de la solicitud y lo valida; ante un error devuelve la respuesta 400 lista. */
export async function parseJsonBody<Output>(
  request: Request,
  schema: ZodType<Output>,
  invalidMessage: string,
): Promise<ParsedBody<Output>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { response: errorResponse("El cuerpo de la solicitud no es un JSON válido", 400) };
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      response: errorResponse(
        invalidMessage,
        400,
        parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      ),
    };
  }
  return { data: parsed.data };
}
