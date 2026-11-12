import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { UnauthorizedError } from "@/lib/errors";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import { assertLoginAllowed, failedLoginLimiter, limitAuthRequests } from "@/lib/security/limiters";
import { authService } from "@/services/services";
import { loginInputSchema } from "@portal/shared-types";

export async function POST(request: NextRequest) {
  try {
    limitAuthRequests(request);
  } catch (error) {
    return domainErrorResponse(error, "POST /api/auth/login");
  }

  const { data, response } = await parseJsonBody(
    request,
    loginInputSchema,
    "Datos de acceso inválidos",
  );
  if (response) return response;

  try {
    // El bloqueo es por email: tras 5 intentos fallidos no se prueba ni la contraseña (spec §56).
    assertLoginAllowed(data.email);
    const user = await authService.login(data);
    failedLoginLimiter.reset(data.email);
    const authenticated = NextResponse.json(user);
    await setSessionCookie(authenticated, user.id);
    return authenticated;
  } catch (error) {
    if (error instanceof UnauthorizedError) failedLoginLimiter.record(data.email);
    return domainErrorResponse(error, "POST /api/auth/login");
  }
}
