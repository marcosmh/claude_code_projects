import type { CreateSessionInput, SessionRecord, UserRecord } from "../types";

export interface AuthRepository {
  countUsers(): Promise<number>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  createUser(input: { email: string; passwordHash: string }): Promise<UserRecord>;
  /** Assigns every invoice without an owner (created before authentication) to `userId`. Returns how many. */
  claimOrphanInvoices(userId: number): Promise<number>;
  createSession(input: CreateSessionInput): Promise<void>;
  /** Looks the session up by the hash of its token. Expiry is the caller's decision. */
  findSession(tokenHash: string): Promise<SessionRecord | null>;
  deleteSession(tokenHash: string): Promise<void>;
  /** Removes sessions that expired before `now`. Returns how many. */
  deleteExpiredSessions(now: Date): Promise<number>;
}
