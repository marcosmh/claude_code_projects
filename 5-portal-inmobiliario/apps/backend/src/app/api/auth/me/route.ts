import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { authorizer } from "@/services/services";

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
