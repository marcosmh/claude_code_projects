import type { NextRequest } from "next/server";
import { describeAdminMutation } from "@/lib/audit/describe-admin-mutation";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { getClientIp } from "@/lib/security/limiters";
import { auditService, authorizer } from "@/services/services";
import type { AuthUserDto, UserRole } from "@portal/shared-types";

type AuthorizedHandler<Params> = (
  request: NextRequest,
  context: { user: AuthUserDto; params: Promise<Params> },
) => Promise<Response> | Response;

/**
 * Protege un Route Handler: exige sesión y el rol indicado antes de ejecutarlo.
 * Responde 401 sin sesión y 403 si el rol no alcanza; el handler recibe el usuario ya verificado.
 *
 *   export const GET = withRole("ADMIN", async (request, { user }) => Response.json(...));
 *
 * Con `{ exact: true }` solo entra ese rol (favoritos y consultas propias: un ADMIN recibe 403).
 */
export function withRole<Params = Record<string, never>>(
  requiredRole: UserRole,
  handler: AuthorizedHandler<Params>,
  options: { exact?: boolean } = {},
) {
  return async (request: NextRequest, context: { params: Promise<Params> }): Promise<Response> => {
    try {
      const user = await authorizer.requireRole(request, requiredRole, options);
      const response = await handler(request, { user, params: context.params });
      if (requiredRole === "ADMIN") await auditAdminMutation(request, user, response);
      return response;
    } catch (error) {
      return domainErrorResponse(error, `${request.method} ${new URL(request.url).pathname}`);
    }
  };
}

const mutatingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Audita (spec §60) las escrituras exitosas de la API de administración en un solo punto: una
 * ruta nueva queda registrada sin código adicional. Nunca altera la respuesta ni la hace fallar.
 */
async function auditAdminMutation(request: NextRequest, user: AuthUserDto, response: Response) {
  if (!mutatingMethods.has(request.method) || response.status >= 400) return;
  try {
    const body: unknown = await response
      .clone()
      .json()
      .catch(() => null);
    const description = describeAdminMutation(request.method, new URL(request.url).pathname, body);
    if (description === null) return;
    await auditService.record({
      ...description,
      actorId: user.id,
      actorEmail: user.email,
      ipAddress: getClientIp(request),
    });
  } catch (error) {
    console.error("No se pudo auditar la acción de administración:", error);
  }
}
