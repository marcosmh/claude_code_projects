import type { PrismaClient } from "../generated/prisma/client";
import type { CreateSessionInput, SessionRecord, UserRecord } from "../types";
import type { AuthRepository } from "./AuthRepository";

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  countUsers(): Promise<number> {
    return this.db.user.count();
  }

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
  }

  createUser(input: { email: string; passwordHash: string }): Promise<UserRecord> {
    return this.db.user.create({
      data: input,
      select: { id: true, email: true, passwordHash: true },
    });
  }

  async claimOrphanInvoices(userId: number): Promise<number> {
    const { count } = await this.db.invoice.updateMany({
      where: { ownerId: null },
      data: { ownerId: userId },
    });
    return count;
  }

  async createSession(input: CreateSessionInput): Promise<void> {
    await this.db.session.create({ data: input });
  }

  async findSession(tokenHash: string): Promise<SessionRecord | null> {
    const row = await this.db.session.findUnique({
      where: { tokenHash },
      select: { expiresAt: true, user: { select: { id: true, email: true } } },
    });
    return row ? { user: row.user, expiresAt: row.expiresAt } : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.db.session.deleteMany({ where: { tokenHash } });
  }

  async deleteExpiredSessions(now: Date): Promise<number> {
    const { count } = await this.db.session.deleteMany({ where: { expiresAt: { lt: now } } });
    return count;
  }
}
