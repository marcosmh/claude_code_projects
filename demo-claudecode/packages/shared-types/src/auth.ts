export type UserRole = "USER" | "ADMIN";

/** The authenticated user as the rest of the app sees it (never carries the password hash). */
export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

/** Body of POST /auth/login and /auth/refresh as the frontend sees it: tokens travel only in httpOnly cookies. */
export interface SessionBodyDto {
  user: AuthUser;
}
