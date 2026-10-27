import type { AuthUser, UserRole } from "@invoices/shared-types";

export type { AuthUser, UserRole };

/** What authenticating a request needs: the user plus the facts that can revoke a live access token. */
export interface AuthIdentity extends AuthUser {
  tokenVersion: number;
  lockedUntil: Date | null;
}

export interface UserRecord extends AuthIdentity {
  passwordHash: string;
}

export interface RefreshTokenRecord {
  id: number;
  /** SHA-256 of the refresh token's jti. */
  tokenHash: string;
  family: string;
  userId: number;
  expiresAt: Date;
  revokedAt: Date | null;
  /** Id of the token that replaced this one on rotation. */
  replacedBy: number | null;
  createdAt: Date;
}

export interface CreateRefreshTokenInput {
  tokenHash: string;
  family: string;
  userId: number;
  expiresAt: Date;
}
