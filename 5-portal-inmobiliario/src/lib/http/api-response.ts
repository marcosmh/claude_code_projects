export type ApiErrorBody = {
  message: string;
  status: number;
  details?: unknown;
};

export function errorResponse(
  message: string,
  status: number,
  details?: unknown,
): Response {
  const body: ApiErrorBody = { message, status };
  if (details !== undefined) body.details = details;
  return Response.json(body, { status });
}
