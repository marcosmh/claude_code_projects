import type { PrismaClient } from "../generated/prisma/client";
import type { AuditEventInput, AuditEventRecord, AuditRepository } from "./AuditRepository";

export class PrismaAuditRepository implements AuditRepository {
  constructor(private readonly db: PrismaClient) {}

  async record({ action, userId, reason }: AuditEventInput): Promise<void> {
    await this.db.auditEvent.create({ data: { action, userId, reason } });
  }

  async findRecent({ action, userId }: { action?: string; userId?: number }, limit: number): Promise<AuditEventRecord[]> {
    const rows = await this.db.auditEvent.findMany({
      where: { action, userId },
      orderBy: { id: "desc" },
      take: limit,
    });
    return rows.map(({ id, action, userId, reason, createdAt }) => ({
      id,
      action,
      createdAt,
      ...(userId !== null && { userId }),
      ...(reason !== null && { reason }),
    }));
  }
}
