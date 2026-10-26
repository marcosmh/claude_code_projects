import type { SessionTokens } from "../services/AuthService";
import type { AuthUser, UserRole } from "../types";

export interface AuthUserDto {
  id: number;
  email: string;
  role: UserRole;
}

/** Body of POST /auth/login and POST /auth/refresh. The refresh token travels only in its cookie. */
export interface SessionDto {
  token: string;
  user: AuthUserDto;
}

export const toAuthUserDto = ({ id, email, role }: AuthUser): AuthUserDto => ({ id, email, role });

export const toSessionDto = ({ token, user }: SessionTokens): SessionDto => ({ token, user: toAuthUserDto(user) });
