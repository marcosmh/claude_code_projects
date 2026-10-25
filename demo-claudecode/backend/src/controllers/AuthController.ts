import { SESSION_TTL_MS, type AuthService } from "../services/AuthService";
import type { AuthUser } from "../types";
import { SESSION_COOKIE, clearedSessionCookie, readCookie, sessionCookie } from "../utils/cookies";
import { noContent, ok } from "../utils/http";
import { changePasswordSchema, loginBodySchema } from "../validators/auth.validator";
import { parseBody } from "./requestParsers";

export const sessionToken = (request: Request) => readCookie(request.headers.get("cookie"), SESSION_COOKIE);

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  async login(request: Request): Promise<Response> {
    const { email, password } = await parseBody(loginBodySchema, request);
    const { token, user } = await this.auth.login(email, password);
    const response = ok(user);
    response.headers.set("Set-Cookie", sessionCookie(token, SESSION_TTL_MS / 1000));
    return response;
  }

  async logout(request: Request): Promise<Response> {
    await this.auth.logout(sessionToken(request));
    const response = noContent();
    response.headers.set("Set-Cookie", clearedSessionCookie());
    return response;
  }

  async changePassword(user: AuthUser, request: Request): Promise<Response> {
    const { currentPassword, newPassword } = await parseBody(changePasswordSchema, request);
    await this.auth.changePassword(user.id, sessionToken(request), currentPassword, newPassword);
    return noContent();
  }

  me(user: AuthUser): Response {
    return ok(user);
  }
}
