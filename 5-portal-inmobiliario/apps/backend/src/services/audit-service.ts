import type { AuditEntry, AuditRecord, AuditRepository } from "@/repositories/audit-repository";
import {
  auditActionsByCategory,
  auditCategoryOf,
  type AuditAction,
  type AuditLogDto,
  type AuditLogListQuery,
  type PaginatedResponse,
} from "@portal/shared-types";

const DAY_MS = 24 * 60 * 60 * 1000;

function toDto(record: AuditRecord): AuditLogDto {
  const action = record.action as AuditAction;
  return {
    id: record.id,
    createdAt: record.createdAt.toISOString(),
    action,
    category: auditCategoryOf(action),
    summary: record.summary,
    actorId: record.actorId,
    actorEmail: record.actorEmail,
    entityType: record.entityType,
    entityId: record.entityId,
    ipAddress: record.ipAddress,
  };
}

/** Registro de auditoría (spec §60). La autorización (ADMIN) de la consulta se aplica en la ruta. */
export function createAuditService(repository: AuditRepository) {
  return {
    /**
     * Registra un evento. Es de mejor esfuerzo: si la escritura falla se informa en el servidor y
     * no se propaga, para que auditar nunca rompa la acción que se está auditando.
     */
    async record(entry: AuditEntry): Promise<void> {
      try {
        await repository.record(entry);
      } catch (error) {
        console.error(`No se pudo registrar el evento de auditoría ${entry.action}:`, error);
      }
    },

    async listLogs(query: AuditLogListQuery): Promise<PaginatedResponse<AuditLogDto>> {
      const { records, total } = await repository.findPage({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        ...(query.category !== undefined && { actions: auditActionsByCategory[query.category] }),
        ...(query.search !== undefined && { searchText: query.search }),
        ...(query.from !== undefined && { createdFrom: new Date(`${query.from}T00:00:00.000Z`) }),
        // `to` es inclusivo: el corte es el inicio del día siguiente.
        ...(query.to !== undefined && {
          createdBefore: new Date(Date.parse(`${query.to}T00:00:00.000Z`) + DAY_MS),
        }),
      });
      return {
        items: records.map(toDto),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
