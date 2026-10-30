import type { SessionTokens } from "../services/AuthService";
import type { AuthUser, SessionBodyDto } from "@invoices/shared-types";

export type AuthUserDto = AuthUser;

/**
 * Body of POST /auth/login and POST /auth/refresh. The refresh token travels only in its cookie. `token` (the access
 * token, for Bearer clients) is present only when the request asked for `mode: "token"`; browsers never get it in JS.
 */
export interface SessionDto extends SessionBodyDto {
  token?: string;
}

export const toAuthUserDto = ({ id, email, role }: AuthUser): AuthUserDto => ({ id, email, role });

export const toSessionDto = ({ token, user }: SessionTokens, includeToken = false): SessionDto => ({
  ...(includeToken && { token }),
  user: toAuthUserDto(user),
});
