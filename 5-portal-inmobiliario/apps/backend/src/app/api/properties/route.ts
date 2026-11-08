import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { propertyListQuerySchema } from "@portal/shared-types";
import { propertyService } from "@/services/services";

export async function GET(request: NextRequest) {
  const parsedQuery = propertyListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsedQuery.success) {
    return errorResponse(
      "Parámetros de consulta inválidos",
      400,
      parsedQuery.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  try {
    const result = await propertyService.listPublishedProperties(parsedQuery.data);
    return Response.json(result);
  } catch (error) {
    console.error("GET /api/properties falló:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
