import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { withRole } from "@/lib/http/with-role";
import { adminInquiryService } from "@/services/services";
import { adminInquiryListQuerySchema } from "@portal/shared-types";

/** Lista paginada de todas las consultas, con búsqueda y filtro por propiedad (solo ADMIN). */
export const GET = withRole("ADMIN", async (request) => {
  const parsedQuery = adminInquiryListQuerySchema.safeParse(
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
  return NextResponse.json(await adminInquiryService.listInquiries(parsedQuery.data), {
    headers: { "Cache-Control": "no-store" },
  });
});
