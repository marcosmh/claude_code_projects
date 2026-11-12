import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { withRole } from "@/lib/http/with-role";
import { auditService } from "@/services/services";
import { auditLogListQuerySchema } from "@portal/shared-types";

/** Registro de auditoría paginado con filtros (solo ADMIN). Es de solo lectura. */
export const GET = withRole("ADMIN", async (request) => {
  const parsedQuery = auditLogListQuerySchema.safeParse(
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
  return NextResponse.json(await auditService.listLogs(parsedQuery.data), {
    headers: { "Cache-Control": "no-store" },
  });
});
