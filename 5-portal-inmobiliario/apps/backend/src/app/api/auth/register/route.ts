import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import { limitAuthRequests } from "@/lib/security/limiters";
import { authService } from "@/services/services";
import { registerInputSchema } from "@portal/shared-types";

export async function POST(request: NextRequest) {
  try {
    limitAuthRequests(request);
  } catch (error) {
    return domainErrorResponse(error, "POST /api/auth/register");
  }

  const { data, response } = await parseJsonBody(
    request,
    registerInputSchema,
    "Datos de registro inválidos",
  );
  if (response) return response;

  try {
    const user = await authService.register(data);
    // Registrarse inicia sesión: la persona no tiene que volver a escribir sus datos.
    const created = NextResponse.json(user, { status: 201 });
    await setSessionCookie(created, user.id);
    return created;
  } catch (error) {
    return domainErrorResponse(error, "POST /api/auth/register");
  }
}
