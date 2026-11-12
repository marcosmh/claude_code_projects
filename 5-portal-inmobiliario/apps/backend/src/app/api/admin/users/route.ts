import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { adminUserService } from "@/services/services";
import { adminUserListQuerySchema, createAdminUserInputSchema } from "@portal/shared-types";

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

/** Da de alta una cuenta activa, normal o de administración (201); 409 si el email ya existe. */
export const POST = withRole("ADMIN", async (request) => {
  const { data, response } = await parseJsonBody(
    request,
    createAdminUserInputSchema,
    "Datos de usuario no válidos",
  );
  if (response) return response;

  return NextResponse.json(await adminUserService.createUser(data), {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
});
