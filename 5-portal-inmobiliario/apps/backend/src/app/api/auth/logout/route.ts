import { NextResponse, type NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";
import { getClientIp } from "@/lib/security/limiters";
import { auditService, authorizer } from "@/services/services";

/** Cierra la sesión borrando la cookie. Es idempotente: sin sesión también responde 204. */
export async function POST(request: NextRequest) {
  // Solo se audita un cierre de sesión con una sesión válida; sin ella no hay a quién atribuirlo.
  const user = await authorizer.authenticateOptional(request).catch(() => null);
  if (user) {
    await auditService.record({
      action: "LOGOUT",
      summary: "Cerró sesión",
      actorId: user.id,
      actorEmail: user.email,
      entityType: "user",
      entityId: user.id,
      ipAddress: getClientIp(request),
    });
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
