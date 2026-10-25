/** The authenticated user as the rest of the app sees it (never carries the password hash). */
export interface AuthUser {
  id: number;
  email: string;
}

export interface UserRecord extends AuthUser {
  passwordHash: string;
  /** The account rejects every login until this instant. */
  lockedUntil: Date | null;
}

export interface SessionRecord {
  user: AuthUser;
  expiresAt: Date;
}

export interface CreateSessionInput {
  tokenHash: string;
  userId: number;
  expiresAt: Date;
}
