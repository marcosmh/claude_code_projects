import type { AuthRepository } from "../../src/repositories/AuthRepository";
import type {
  AuthIdentity,
  CreateRefreshTokenInput,
  CreateSessionInput,
  RefreshTokenRecord,
  SessionRecord,
  UserRecord,
  UserRole,
} from "../../src/types";
import type { FakeInvoiceRepository } from "./FakeInvoiceRepository";

export class FakeAuthRepository implements AuthRepository {
  readonly users: UserRecord[] = [];
  /** user id -> consecutive failed logins */
  readonly failures = new Map<number, number>();
  readonly sessions = new Map<string, { userId: number; expiresAt: Date }>();
  readonly refreshTokens: RefreshTokenRecord[] = [];
  private nextId = 1;
  private nextRefreshId = 1;

  /** Optional: lets claimOrphanInvoices see the invoices of a fake invoice repository. */
  constructor(private readonly invoices?: FakeInvoiceRepository) {}

  async countUsers() {
    return this.users.length;
  }
  async findUserByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async findUserById(id: number) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async findAuthIdentity(id: number): Promise<AuthIdentity | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    const { id: userId, email, role, tokenVersion, lockedUntil } = user;
    return { id: userId, email, role, tokenVersion, lockedUntil };
  }
  async createUser(input: { email: string; passwordHash: string; role?: UserRole }) {
    const { role = "USER", ...rest } = input;
    const user: UserRecord = { id: this.nextId++, ...rest, role, tokenVersion: 0, lockedUntil: null };
    this.users.push(user);
    return user;
  }
  async registerFailedLogin(userId: number, maxAttempts: number, lockUntil: Date) {
    const count = (this.failures.get(userId) ?? 0) + 1;
    if (count >= maxAttempts) {
      this.failures.set(userId, 0);
      this.users.find((u) => u.id === userId)!.lockedUntil = lockUntil;
    } else this.failures.set(userId, count);
  }
  async clearLoginFailures(userId: number) {
    this.failures.delete(userId);
    this.users.find((u) => u.id === userId)!.lockedUntil = null;
  }
  async updatePassword(userId: number, passwordHash: string) {
    this.users.find((u) => u.id === userId)!.passwordHash = passwordHash;
    await this.clearLoginFailures(userId);
  }
  async deleteOtherSessions(userId: number, keepTokenHash: string) {
    let count = 0;
    for (const [hash, s] of this.sessions) {
      if (s.userId === userId && hash !== keepTokenHash) {
        this.sessions.delete(hash);
        count++;
      }
    }
    return count;
  }
  async claimOrphanInvoices(userId: number) {
    let count = 0;
    for (const id of this.invoices?.rows.keys() ?? []) {
      if (!this.invoices!.owners.has(id)) {
        this.invoices!.owners.set(id, userId);
        count++;
      }
    }
    return count;
  }
  async createSession({ tokenHash, userId, expiresAt }: CreateSessionInput) {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }
  async findSession(tokenHash: string): Promise<SessionRecord | null> {
    const session = this.sessions.get(tokenHash);
    const user = this.users.find((u) => u.id === session?.userId);
    return session && user ? { user: { id: user.id, email: user.email }, expiresAt: session.expiresAt } : null;
  }
  async deleteSession(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
  async deleteExpiredSessions(now: Date) {
    let count = 0;
    for (const [hash, s] of this.sessions) {
      if (s.expiresAt < now) {
        this.sessions.delete(hash);
        count++;
      }
    }
    return count;
  }

  async createRefreshToken(input: CreateRefreshTokenInput) {
    const record: RefreshTokenRecord = {
      id: this.nextRefreshId++,
      ...input,
      revokedAt: null,
      replacedBy: null,
      createdAt: new Date(),
    };
    this.refreshTokens.push(record);
    return record;
  }
  async findRefreshToken(tokenHash: string) {
    return this.refreshTokens.find((t) => t.tokenHash === tokenHash) ?? null;
  }
  async rotateRefreshToken(currentTokenHash: string, next: CreateRefreshTokenInput, now: Date) {
    const current = this.refreshTokens.find((t) => t.tokenHash === currentTokenHash);
    if (!current || current.revokedAt) return null;
    current.revokedAt = now;
    const created = await this.createRefreshToken(next);
    current.replacedBy = created.id;
    return created;
  }
  async revokeRefreshTokenFamily(family: string, now: Date) {
    const active = this.refreshTokens.filter((t) => t.family === family && !t.revokedAt);
    active.forEach((t) => (t.revokedAt = now));
    return active.length;
  }
  async revokeAllRefreshTokens(userId: number, now: Date) {
    const active = this.refreshTokens.filter((t) => t.userId === userId && !t.revokedAt);
    active.forEach((t) => (t.revokedAt = now));
    return active.length;
  }
  async revokeOtherRefreshTokens(userId: number, keepFamily: string, now: Date) {
    const active = this.refreshTokens.filter((t) => t.userId === userId && !t.revokedAt && t.family !== keepFamily);
    active.forEach((t) => (t.revokedAt = now));
    return active.length;
  }
  async deleteExpiredRefreshTokens(now: Date) {
    const before = this.refreshTokens.length;
    const kept = this.refreshTokens.filter((t) => t.expiresAt >= now);
    this.refreshTokens.splice(0, before, ...kept);
    return before - kept.length;
  }
  async getTokenVersion(userId: number) {
    return this.users.find((u) => u.id === userId)?.tokenVersion ?? null;
  }
  async incrementTokenVersion(userId: number) {
    const user = this.users.find((u) => u.id === userId);
    return user ? ++user.tokenVersion : null;
  }
  async getUserRole(userId: number) {
    return this.users.find((u) => u.id === userId)?.role ?? null;
  }
}
