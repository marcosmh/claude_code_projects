import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import {
  assertLoginAllowed,
  failedLoginLimiter,
  getClientIp,
  limitAuthRequests,
} from "@/lib/security/limiters";
import { auditService, authService } from "@/services/services";
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
    await auditService.record({
      action: "LOGIN_SUCCESS",
      summary: "Inició sesión",
      actorId: user.id,
      actorEmail: user.email,
      entityType: "user",
      entityId: user.id,
      ipAddress: getClientIp(request),
    });
    const authenticated = NextResponse.json(user);
    await setSessionCookie(authenticated, user.id);
    return authenticated;
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
      await auditLoginFailure(request, data.email, error);
    }
    return domainErrorResponse(error, "POST /api/auth/login");
  }
}

/** Registra el intento fallido y, si completa el límite de intentos, el bloqueo (spec §56 y §60). */
async function auditLoginFailure(request: NextRequest, email: string, error: Error) {
  const ipAddress = getClientIp(request);
  const isWrongPassword = error instanceof UnauthorizedError;
  if (isWrongPassword) failedLoginLimiter.record(email);

  await auditService.record({
    action: "LOGIN_FAILED",
    summary: isWrongPassword
      ? "Intento de inicio de sesión fallido"
      : "Intento de inicio de sesión con una cuenta desactivada",
    actorEmail: email,
    ipAddress,
  });
  if (isWrongPassword && failedLoginLimiter.check(email).isBlocked) {
    await auditService.record({
      action: "LOGIN_LOCKED",
      summary: "Cuenta bloqueada temporalmente por demasiados intentos fallidos",
      actorEmail: email,
      ipAddress,
    });
  }
}
