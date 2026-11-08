import type { NextRequest } from "next/server";
import { NotFoundError } from "@/lib/errors";
import { errorResponse } from "@/lib/http/api-response";
import { propertyService } from "@/services/services";

export async function GET(
  _request: NextRequest,
  context: RouteContext<"/api/properties/[id]">,
) {
  const { id } = await context.params;

  try {
    const property = await propertyService.getPublishedPropertyById(id);
    return Response.json(property);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return errorResponse(error.message, 404);
    }
    console.error("GET /api/properties/[id] falló:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
