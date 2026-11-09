import type { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieName, sessionDurationSeconds } from "./session";

// httpOnly: JavaScript del navegador no puede leerla. SameSite=Lax: no viaja en POST de otros sitios.
const baseCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
} as const;

function isSecureContext(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function setSessionCookie(response: NextResponse, userId: string): Promise<void> {
  response.cookies.set(sessionCookieName, await createSessionToken(userId), {
    ...baseCookieOptions,
    secure: isSecureContext(),
    maxAge: sessionDurationSeconds,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(sessionCookieName, "", {
    ...baseCookieOptions,
    secure: isSecureContext(),
    maxAge: 0,
  });
}

export function readSessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(sessionCookieName)?.value;
}
