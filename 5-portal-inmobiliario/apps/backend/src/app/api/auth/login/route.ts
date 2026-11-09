import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/auth/session-cookie";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import { authService } from "@/services/services";
import { loginInputSchema } from "@portal/shared-types";

export async function POST(request: NextRequest) {
  const { data, response } = await parseJsonBody(
    request,
    loginInputSchema,
    "Datos de acceso inválidos",
  );
  if (response) return response;

  try {
    const user = await authService.login(data);
    const authenticated = NextResponse.json(user);
    await setSessionCookie(authenticated, user.id);
    return authenticated;
  } catch (error) {
    return domainErrorResponse(error, "POST /api/auth/login");
  }
}
