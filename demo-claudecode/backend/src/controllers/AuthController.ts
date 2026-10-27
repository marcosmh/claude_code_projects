import { toAuthUserDto, toSessionDto } from "../dto/auth.dto";
import type { AuthService, SessionTokens } from "../services/AuthService";
import type { AuthUser } from "../types";
import { REFRESH_COOKIE, clearedRefreshCookie, readCookie, refreshCookie } from "../utils/cookies";
import { RateLimitedError, RefreshReplayInGraceError, UnauthorizedError } from "../utils/errors";
import { errorResponse, noContent, ok } from "../utils/http";
import { EMAIL_LOGIN_LIMIT, RateLimiter } from "../utils/rateLimit";
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
  constructor(
    private readonly auth: AuthService,
    /** Login attempts per normalised email, whatever the IP: rotating IPs does not multiply the budget. */
    private readonly emailLimiter = new RateLimiter(),
    private readonly emailLimitDisabled = process.env.RATE_LIMIT_DISABLED === "1" && process.env.NODE_ENV !== "production",
  ) {}

  async login(request: Request): Promise<Response> {
    const { email, password } = await parseBody(loginBodySchema, request);
    // Counts every attempt for the address, existing or not, with the same answer: reveals nothing about accounts.
    const hit = this.emailLimitDisabled ? undefined : this.emailLimiter.hit(`login:${email}`, EMAIL_LOGIN_LIMIT);
    if (hit && !hit.allowed) {
      throw new RateLimitedError("Demasiadas peticiones, inténtalo de nuevo en unos segundos", hit.retryAfter);
    }
    return sessionResponse(await this.auth.login(email, password));
  }

  async refresh(request: Request): Promise<Response> {
    try {
      return sessionResponse(await this.auth.refresh(refreshTokenOf(request)));
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) throw error;
      const response = errorResponse(error);
      // Replay inside the grace window (two tabs, lost response): the browser already holds, or is about to
      // receive, the rotated cookie, so clearing it here would log the legitimate session out.
      if (!(error instanceof RefreshReplayInGraceError)) {
        // The cookie is useless now: tell the browser to drop it.
        response.headers.set("Set-Cookie", clearedRefreshCookie());
      }
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
