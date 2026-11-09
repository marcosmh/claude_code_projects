import { errorResponse } from "@/lib/http/api-response";
import { propertyService } from "@/services/services";

export async function GET() {
  try {
    return Response.json(await propertyService.listPublishedLocations());
  } catch (error) {
    console.error("GET /api/locations falló:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
