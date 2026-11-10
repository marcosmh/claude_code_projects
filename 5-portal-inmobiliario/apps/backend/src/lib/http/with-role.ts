import type { NextRequest } from "next/server";
import { domainErrorResponse } from "@/lib/http/domain-error-response";
import { authorizer } from "@/services/services";
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
 */
export function withRole<Params = Record<string, never>>(
  requiredRole: UserRole,
  handler: AuthorizedHandler<Params>,
) {
  return async (request: NextRequest, context: { params: Promise<Params> }): Promise<Response> => {
    try {
      const user = await authorizer.requireRole(request, requiredRole);
      return await handler(request, { user, params: context.params });
    } catch (error) {
      return domainErrorResponse(error, `${request.method} ${new URL(request.url).pathname}`);
    }
  };
}
