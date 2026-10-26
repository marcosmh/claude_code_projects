export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

/** Cuerpo de `/auth/login` y `/auth/refresh`: access token (JWT) y usuario. */
export interface AuthSession {
  token: string;
  user: AuthUser;
}
