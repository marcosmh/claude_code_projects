import type { PrismaClient } from "../generated/prisma/client";
import type { CreateSessionInput, SessionRecord, UserRecord } from "../types";
import type { AuthRepository } from "./AuthRepository";

const userSelect = { id: true, email: true, passwordHash: true, lockedUntil: true } as const;

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  countUsers(): Promise<number> {
    return this.db.user.count();
  }

  findUserByEmail(email: string): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { email }, select: userSelect });
  }

  findUserById(id: number): Promise<UserRecord | null> {
    return this.db.user.findUnique({ where: { id }, select: userSelect });
  }

  createUser(input: { email: string; passwordHash: string }): Promise<UserRecord> {
    return this.db.user.create({ data: input, select: userSelect });
  }

  async registerFailedLogin(userId: number, maxAttempts: number, lockUntil: Date): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const { failedLogins } = await tx.user.update({
        where: { id: userId },
        data: { failedLogins: { increment: 1 } },
        select: { failedLogins: true },
      });
      if (failedLogins >= maxAttempts) {
        await tx.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: lockUntil } });
      }
    });
  }

  async clearLoginFailures(userId: number): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: null } });
  }

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await this.db.user.update({ where: { id: userId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } });
  }

  async deleteOtherSessions(userId: number, keepTokenHash: string): Promise<number> {
    const { count } = await this.db.session.deleteMany({ where: { userId, tokenHash: { not: keepTokenHash } } });
    return count;
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
