import { toAuthUserDto, toSessionDto } from "../dto/auth.dto";
import type { AuthService, SessionTokens } from "../services/AuthService";
import type { AuthUser } from "../types";
import { REFRESH_COOKIE, clearedRefreshCookie, readCookie, refreshCookie } from "../utils/cookies";
import { UnauthorizedError } from "../utils/errors";
import { errorResponse, noContent, ok } from "../utils/http";
import { changePasswordSchema, loginBodySchema } from "../validators/auth.validator";
import { parseBody } from "./requestParsers";

const refreshTokenOf = (request: Request) => readCookie(request.headers.get("cookie"), REFRESH_COOKIE);

/** Session response: access token in the body, rotated refresh token in its httpOnly cookie. */
function sessionResponse(session: SessionTokens): Response {
  const response = ok(toSessionDto(session));
  response.headers.set("Set-Cookie", refreshCookie(session.refreshToken, session.refreshMaxAgeSeconds));
  return response;
}

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  async login(request: Request): Promise<Response> {
    const { email, password } = await parseBody(loginBodySchema, request);
    return sessionResponse(await this.auth.login(email, password));
  }

  async refresh(request: Request): Promise<Response> {
    try {
      return sessionResponse(await this.auth.refresh(refreshTokenOf(request)));
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
      // The cookie is useless now: tell the browser to drop it.
      const response = errorResponse(error);
      response.headers.set("Set-Cookie", clearedRefreshCookie());
      return response;
    }
  }

  async logout(request: Request): Promise<Response> {
    await this.auth.logout(refreshTokenOf(request));
    const response = noContent();
    response.headers.set("Set-Cookie", clearedRefreshCookie());
    return response;
  }

  async changePassword(user: AuthUser, request: Request): Promise<Response> {
    const { currentPassword, newPassword } = await parseBody(changePasswordSchema, request);
    await this.auth.changePassword(user.id, refreshTokenOf(request), currentPassword, newPassword);
    return noContent();
  }

  me(user: AuthUser): Response {
    return ok(toAuthUserDto(user));
  }
}
