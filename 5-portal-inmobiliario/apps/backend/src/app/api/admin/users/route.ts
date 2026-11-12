import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { withRole } from "@/lib/http/with-role";
import { adminUserService } from "@/services/services";
import { adminUserListQuerySchema } from "@portal/shared-types";

/** Lista paginada de usuarios con búsqueda, rol y estado (solo ADMIN). */
export const GET = withRole("ADMIN", async (request) => {
  const parsedQuery = adminUserListQuerySchema.safeParse(
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
  return NextResponse.json(await adminUserService.listUsers(parsedQuery.data), {
    headers: { "Cache-Control": "no-store" },
  });
});
