import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { authService, authorizer } from "@/services/services";
import { updateProfileInputSchema } from "@portal/shared-types";

export async function GET(request: NextRequest) {
  try {
    const user = await authorizer.authenticate(request);
    return NextResponse.json(user, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = domainErrorResponse(error, "GET /api/auth/me");
    if (response.status !== 401) return response;
    // Sesión caducada, manipulada o de una cuenta que ya no existe: se borra la cookie.
    const unauthorized = new NextResponse(response.body, {
      status: 401,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
    clearSessionCookie(unauthorized);
    return unauthorized;
  }
}

/** Actualiza el perfil de quien tiene la sesión. El id sale de la sesión, nunca del cuerpo. */
export const PATCH = withRole("USER", async (request, { user }) => {
  const { data, response } = await parseJsonBody(
    request,
    updateProfileInputSchema,
    "Datos de perfil no válidos",
  );
  if (response) return response;

  const updatedUser = await authService.updateProfile(user.id, data);
  return NextResponse.json(updatedUser, { headers: { "Cache-Control": "no-store" } });
});
