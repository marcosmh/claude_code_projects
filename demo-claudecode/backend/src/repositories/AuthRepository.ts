import type { CreateSessionInput, SessionRecord, UserRecord } from "../types";

export interface AuthRepository {
  countUsers(): Promise<number>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(id: number): Promise<UserRecord | null>;
  createUser(input: { email: string; passwordHash: string }): Promise<UserRecord>;
  /**
   * Counts one failed attempt. When the count reaches `maxAttempts` the account is locked until
   * `lockUntil` and the count restarts. The increment is atomic (concurrent guesses are all counted).
   */
  registerFailedLogin(userId: number, maxAttempts: number, lockUntil: Date): Promise<void>;
  /** Forgets earlier failures and any lock (after a successful login). */
  clearLoginFailures(userId: number): Promise<void>;
  /** Replaces the password hash and forgets failures and locks. */
  updatePassword(userId: number, passwordHash: string): Promise<void>;
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
}
