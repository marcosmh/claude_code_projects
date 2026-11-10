import type { NextRequest } from "next/server";
import { NotFoundError } from "@/lib/errors";
import { errorResponse } from "@/lib/http/api-response";
import { inquiryInputSchema } from "@portal/shared-types";
import { authorizer, inquiryService } from "@/services/services";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse("El cuerpo de la solicitud no es un JSON válido", 400);
  }

  const parsedInput = inquiryInputSchema.safeParse(payload);
  if (!parsedInput.success) {
    return errorResponse(
      "Datos de consulta inválidos",
      400,
      parsedInput.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  try {
    // La consulta es pública; si hay una sesión válida se asocia a su usuario (nunca desde el cuerpo).
    const user = await authorizer.authenticateOptional(request);
    const inquiry = await inquiryService.submitInquiry(parsedInput.data, user?.id);
    return Response.json(inquiry, { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return errorResponse(error.message, 404);
    }
    console.error("POST /api/inquiries falló:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
