import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { adminPropertyService } from "@/services/services";
import { adminPropertyListQuerySchema, propertyInputSchema } from "@portal/shared-types";

/** Lista paginada de propiedades de cualquier estado (solo ADMIN). */
export const GET = withRole("ADMIN", async (request) => {
  const parsedQuery = adminPropertyListQuerySchema.safeParse(
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
  const properties = await adminPropertyService.listProperties(parsedQuery.data);
  return NextResponse.json(properties, { headers: { "Cache-Control": "no-store" } });
});

/** Crea una propiedad (201). */
export const POST = withRole("ADMIN", async (request) => {
  const { data, response } = await parseJsonBody(
    request,
    propertyInputSchema,
    "Datos de propiedad no válidos",
  );
  if (response) return response;

  const property = await adminPropertyService.createProperty(data);
  return NextResponse.json(property, { status: 201, headers: { "Cache-Control": "no-store" } });
});
