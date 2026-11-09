import { errorResponse } from "@/lib/http/api-response";
import { propertyService } from "@/services/services";

export async function GET() {
  try {
    // Cambia raramente: se puede servir desde caché compartida unos minutos.
    return Response.json(await propertyService.listPublishedLocations(), {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("GET /api/locations falló:", error);
    return errorResponse("Error interno del servidor", 500);
  }
}
