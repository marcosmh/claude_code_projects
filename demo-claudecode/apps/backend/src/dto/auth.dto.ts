import type { SessionTokens } from "../services/AuthService";
import type { AuthUser, SessionBodyDto } from "@invoices/shared-types";

export type AuthUserDto = AuthUser;

/**
 * Body of POST /auth/login and POST /auth/refresh. The refresh token travels only in its cookie;
 * `token` is for Bearer clients (the frontend ignores it, see SessionBodyDto).
 */
export interface SessionDto extends SessionBodyDto {
  token: string;
}

export const toAuthUserDto = ({ id, email, role }: AuthUser): AuthUserDto => ({ id, email, role });

export const toSessionDto = ({ token, user }: SessionTokens): SessionDto => ({ token, user: toAuthUserDto(user) });
