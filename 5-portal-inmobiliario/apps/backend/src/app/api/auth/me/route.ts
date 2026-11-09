import { NextResponse, type NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/errors";
import { clearSessionCookie, readSessionToken } from "@/lib/auth/session-cookie";
import { verifySessionToken } from "@/lib/auth/session";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { authService } from "@/services/services";

export async function GET(request: NextRequest) {
  try {
    const token = readSessionToken(request);
    const userId = token ? await verifySessionToken(token) : null;
    if (userId === null) throw new UnauthorizedError("No has iniciado sesión");

    const user = await authService.getCurrentUser(userId);
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
