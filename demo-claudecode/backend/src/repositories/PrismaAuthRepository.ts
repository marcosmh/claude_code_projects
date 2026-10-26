import { Prisma, type PrismaClient } from "../generated/prisma/client";
import type {
  AuthIdentity,
  CreateRefreshTokenInput,
  CreateSessionInput,
  RefreshTokenRecord,
  SessionRecord,
  UserRecord,
  UserRole,
} from "../types";
import type { AuthRepository } from "./AuthRepository";

const identitySelect = { id: true, email: true, role: true, tokenVersion: true, lockedUntil: true } as const;
const userSelect = { ...identitySelect, passwordHash: true } as const;

// `role` is a plain string column validated by the service layer, so narrow it once here.
const withRole = <T extends { role: string }>(row: T) => ({ ...row, role: row.role as UserRole });

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  countUsers(): Promise<number> {
    return this.db.user.count();
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { email }, select: userSelect });
    return row && withRole(row);
  }

  async findUserById(id: number): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { id }, select: userSelect });
    return row && withRole(row);
  }

  async findAuthIdentity(id: number): Promise<AuthIdentity | null> {
    const row = await this.db.user.findUnique({ where: { id }, select: identitySelect });
    return row && withRole(row);
  }

  async createUser(input: { email: string; passwordHash: string; role?: UserRole }): Promise<UserRecord> {
    return withRole(await this.db.user.create({ data: input, select: userSelect }));
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

  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    return this.db.refreshToken.create({ data: input });
  }

  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.db.refreshToken.findUnique({ where: { tokenHash } });
  }

  async rotateRefreshToken(
    currentTokenHash: string,
    next: CreateRefreshTokenInput,
    now: Date,
  ): Promise<RefreshTokenRecord | null> {
    return this.db.$transaction(async (tx) => {
      // Conditional update: only one concurrent rotation can flip revokedAt from null
      const { count } = await tx.refreshToken.updateMany({
        where: { tokenHash: currentTokenHash, revokedAt: null },
        data: { revokedAt: now },
      });
      if (count === 0) return null;
      const created = await tx.refreshToken.create({ data: next });
      await tx.refreshToken.update({ where: { tokenHash: currentTokenHash }, data: { replacedBy: created.id } });
      return created;
    });
  }

  async revokeRefreshTokenFamily(family: string, now: Date): Promise<number> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: now },
    });
    return count;
  }

  async revokeAllRefreshTokens(userId: number, now: Date): Promise<number> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return count;
  }

  async revokeOtherRefreshTokens(userId: number, keepFamily: string, now: Date): Promise<number> {
    const { count } = await this.db.refreshToken.updateMany({
      where: { userId, revokedAt: null, family: { not: keepFamily } },
      data: { revokedAt: now },
    });
    return count;
  }

  async deleteExpiredRefreshTokens(now: Date): Promise<number> {
    const { count } = await this.db.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } });
    return count;
  }

  async getTokenVersion(userId: number): Promise<number | null> {
    const row = await this.db.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } });
    return row?.tokenVersion ?? null;
  }

  async incrementTokenVersion(userId: number): Promise<number | null> {
    try {
      const row = await this.db.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
        select: { tokenVersion: true },
      });
      return row.tokenVersion;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return null;
      throw error;
    }
  }

  async getUserRole(userId: number): Promise<UserRole | null> {
    const row = await this.db.user.findUnique({ where: { id: userId }, select: { role: true } });
    return row ? (row.role as UserRole) : null;
  }
}
