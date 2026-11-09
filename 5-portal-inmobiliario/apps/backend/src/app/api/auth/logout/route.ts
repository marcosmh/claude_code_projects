import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";

/** Cierra la sesión borrando la cookie. Es idempotente: sin sesión también responde 204. */
export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
}
