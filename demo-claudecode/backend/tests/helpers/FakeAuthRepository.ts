import type { AuthRepository } from "../../src/repositories/AuthRepository";
import type { CreateSessionInput, SessionRecord, UserRecord } from "../../src/types";
import type { FakeInvoiceRepository } from "./FakeInvoiceRepository";

export class FakeAuthRepository implements AuthRepository {
  readonly users: UserRecord[] = [];
  readonly sessions = new Map<string, { userId: number; expiresAt: Date }>();
  private nextId = 1;

  /** Optional: lets claimOrphanInvoices see the invoices of a fake invoice repository. */
  constructor(private readonly invoices?: FakeInvoiceRepository) {}

  async countUsers() {
    return this.users.length;
  }
  async findUserByEmail(email: string) {
    return this.users.find((u) => u.email === email) ?? null;
  }
  async createUser(input: { email: string; passwordHash: string }) {
    const user = { id: this.nextId++, ...input };
    this.users.push(user);
    return user;
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
}
