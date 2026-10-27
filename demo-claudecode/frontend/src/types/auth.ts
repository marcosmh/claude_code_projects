export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

/** Cuerpo de `/auth/login` y `/auth/refresh`: el usuario. Los tokens viajan solo en cookies httpOnly. */
export interface AuthSession {
  user: AuthUser;
}
