import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { database } from "@/lib/database/client";
import type { AuditAction } from "@portal/shared-types";

export type AuditEntry = {
  action: AuditAction;
  summary: string;
  actorId?: string | null;
  actorEmail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
};

export type AuditRecord = {
  id: string;
  createdAt: Date;
  action: string;
  summary: string;
  actorId: string | null;
  actorEmail: string | null;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
};

export type AuditPageOptions = {
  skip: number;
  take: number;
  actions?: readonly AuditAction[];
  searchText?: string;
  /** Inicio (inclusive) y fin (exclusive) del rango de fechas. */
  createdFrom?: Date;
  createdBefore?: Date;
};

export type AuditRepository = {
  record(entry: AuditEntry): Promise<void>;
  /** Página del registro, la entrada más reciente primero. */
  findPage(options: AuditPageOptions): Promise<{ records: AuditRecord[]; total: number }>;
};

export const auditRepository: AuditRepository = {
  async record(entry) {
    await database.auditLog.create({
      data: {
        action: entry.action,
        summary: entry.summary,
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  },

  async findPage({ skip, take, actions, searchText, createdFrom, createdBefore }) {
    const where: Prisma.AuditLogWhereInput = {};
    if (actions) where.action = { in: [...actions] };
    if (createdFrom || createdBefore) {
      where.createdAt = {
        ...(createdFrom && { gte: createdFrom }),
        ...(createdBefore && { lt: createdBefore }),
      };
    }
    if (searchText) {
      where.OR = [
        { summary: { contains: searchText, mode: "insensitive" } },
        { actorEmail: { contains: searchText, mode: "insensitive" } },
        { entityId: { equals: searchText } },
      ];
    }

    const [records, total] = await Promise.all([
      database.auditLog.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      database.auditLog.count({ where }),
    ]);
    return { records, total };
  },
};
