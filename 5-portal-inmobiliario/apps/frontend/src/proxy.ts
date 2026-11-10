import { NextResponse, type NextRequest } from "next/server";
import { hasRole, type AuthUserDto } from "@portal/shared-types";
import { buildLoginPath, findRequiredRole } from "@/lib/route-access";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";
const SESSION_CHECK_TIMEOUT_MS = 5_000;

/** Pregunta al backend quién es la persona de la cookie. Cualquier fallo cuenta como "sin sesión". */
async function fetchSessionUser(request: NextRequest): Promise<AuthUserDto | null> {
  try {
    const response = await fetch(`${backendUrl}/api/auth/me`, {
      headers: { cookie: request.headers.get("cookie") ?? "", accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(SESSION_CHECK_TIMEOUT_MS),
    });
    return response.ok ? ((await response.json()) as AuthUserDto) : null;
  } catch {
    return null;
  }
}

/**
 * Protege páginas antes de renderizarlas: sin sesión redirige a /login (recordando la ruta) y con
 * un rol insuficiente muestra /forbidden con estado 403. La decisión la toma el backend; esta
 * barrera evita servir páginas privadas, pero los datos se protegen en cada endpoint de la API.
 */
export async function proxy(request: NextRequest) {
  const requiredRole = findRequiredRole(request.nextUrl.pathname);
  if (requiredRole === null) return NextResponse.next();

  const user = await fetchSessionUser(request);
  if (user === null) {
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(new URL(buildLoginPath(`${pathname}${search}`), request.url));
  }
  if (!hasRole(user.role, requiredRole)) {
    return NextResponse.rewrite(new URL("/forbidden", request.url), { status: 403 });
  }
  return NextResponse.next();
}

// Debe coincidir con `protectedRoutes` en src/lib/route-access.ts.
export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
