import type {
  AuthIdentity,
  CreateRefreshTokenInput,
  CreateSessionInput,
  RefreshTokenRecord,
  SessionRecord,
  UserRecord,
  UserRole,
} from "../types";

export interface AuthRepository {
  countUsers(): Promise<number>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: number): Promise<UserRecord | null>;
  /** One lean read (no password hash) for authenticating a request. */
  findAuthIdentity(id: number): Promise<AuthIdentity | null>;
  createUser(input: { email: string; passwordHash: string; role?: UserRole }): Promise<UserRecord>;
  /**
   * Counts one failed attempt. When the count reaches `maxAttempts` the account is locked until
   * `lockUntil` and the count restarts. The increment is atomic (concurrent guesses are all counted).
   */
  registerFailedLogin(userId: number, maxAttempts: number, lockUntil: Date): Promise<void>;
  /**
   * Reserves one password check BEFORE the password is verified, atomically: returns false (and reserves
   * nothing) if the account is locked at `now`; otherwise counts the attempt and returns true while at most
   * `maxAttempts` checks are outstanding. Past that it locks the account until `lockUntil` (counter restarts)
   * and returns false. Concurrent logins therefore cannot verify more than `maxAttempts` guesses.
   */
  reserveLoginAttempt(userId: number, maxAttempts: number, lockUntil: Date, now: Date): Promise<boolean>;
  /**
   * After a wrong password that held a reservation: locks the account (counter restarts) if the counter has
   * reached `maxAttempts`. Does not count again.
   */
  settleFailedLogin(userId: number, maxAttempts: number, lockUntil: Date): Promise<void>;
  /**
   * After a right password that held a reservation: clears the counter and the lock, but only if the account
   * is not locked at `now` (conditional write). Returns false if it got locked meanwhile: the login must fail.
   */
  completeLogin(userId: number, now: Date): Promise<boolean>;
  /** Forgets earlier failures and any lock (after a successful login). */
  clearLoginFailures(userId: number): Promise<void>;
  /** Replaces the password hash and forgets failures and locks. */
  updatePassword(userId: number, passwordHash: string): Promise<void>;
  /**
   * Replaces the password hash with an upgraded hash of the SAME password (scrypt rehash), only if the stored
   * hash is still `expectedHash`. Touches nothing else (tokenVersion, locks, tokens). Returns whether it wrote.
   */
  updatePasswordHash(userId: number, passwordHash: string, expectedHash: string): Promise<boolean>;
  /** Revokes every session of the user except the one with `keepTokenHash`. Returns how many. */
  deleteOtherSessions(userId: number, keepTokenHash: string): Promise<number>;
  /** Assigns every invoice without an owner (created before authentication) to `userId`. Returns how many. */
  claimOrphanInvoices(userId: number): Promise<number>;
  createSession(input: CreateSessionInput): Promise<void>;
  /** Looks the session up by the hash of its token. Expiry is the caller's decision. */
  findSession(tokenHash: string): Promise<SessionRecord | null>;
  deleteSession(tokenHash: string): Promise<void>;
  /** Removes sessions that expired before `now`. Returns how many. */
  deleteExpiredSessions(now: Date): Promise<number>;

  /** Stores a refresh token (by the hash of its jti). */
  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;
  /** Looks a refresh token up by its hash, including revoked and expired ones (the caller decides). */
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /**
   * Atomically rotates a token: marks `currentTokenHash` revoked with `replacedBy` set to the new row, and
   * creates the new token. Returns null (and changes nothing) if the current token does not exist or is
   * already revoked, so two concurrent rotations cannot both succeed.
   */
  rotateRefreshToken(
    currentTokenHash: string,
    next: CreateRefreshTokenInput,
    now: Date,
  ): Promise<RefreshTokenRecord | null>;
  /** Revokes every still-active token of the family. Returns how many. */
  /** True while the family still has an unrevoked, unexpired refresh token (the session is alive). */
  isRefreshFamilyLive(family: string, now: Date): Promise<boolean>;
  revokeRefreshTokenFamily(family: string, now: Date): Promise<number>;
  /** Revokes every still-active refresh token of the user. Returns how many. */
  revokeAllRefreshTokens(userId: number, now: Date): Promise<number>;
  /** Revokes every still-active refresh token of the user except those of `keepFamily`. Returns how many. */
  revokeOtherRefreshTokens(userId: number, keepFamily: string, now: Date): Promise<number>;
  /** Removes refresh tokens that expired before `now`. Returns how many. */
  deleteExpiredRefreshTokens(now: Date): Promise<number>;
  getTokenVersion(userId: number): Promise<number | null>;
  /** Increments the version atomically and returns the new value (null if the user does not exist). */
  incrementTokenVersion(userId: number): Promise<number | null>;
  getUserRole(userId: number): Promise<UserRole | null>;
}
