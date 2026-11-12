import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { AdminUserRecord, AdminUserRepository } from "@/repositories/admin-user-repository";
import type {
  AdminUserDto,
  AdminUserListQuery,
  PaginatedResponse,
  UpdateAdminUserInput,
} from "@portal/shared-types";

function toDto(record: AdminUserRecord): AdminUserDto {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    role: record.role,
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    favoritesCount: record._count.favorites,
    inquiriesCount: record._count.inquiries,
  };
}

/** Administración de usuarios para ADMIN. La autorización se aplica en las rutas con `withRole`. */
export function createAdminUserService(repository: AdminUserRepository) {
  return {
    async listUsers(query: AdminUserListQuery): Promise<PaginatedResponse<AdminUserDto>> {
      const { records, total } = await repository.findPage({
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        status: query.status,
        ...(query.search !== undefined && { searchText: query.search }),
        ...(query.role !== undefined && { role: query.role }),
      });
      return {
        items: records.map(toDto),
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      };
    },

    async getUser(userId: string): Promise<AdminUserDto> {
      const record = await repository.findById(userId);
      if (record === null) throw new NotFoundError("Usuario no encontrado");
      return toDto(record);
    },

    /** Un ADMIN no puede cambiar su propio rol ni desactivarse: siempre queda un ADMIN activo. */
    async updateUser(
      actingUserId: string,
      userId: string,
      input: UpdateAdminUserInput,
    ): Promise<AdminUserDto> {
      if (actingUserId === userId) {
        throw new ForbiddenError("No puedes cambiar tu propio rol ni desactivar tu cuenta");
      }
      const record = await repository.update(userId, {
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        ...(input.role !== undefined && { role: input.role }),
      });
      if (record === null) throw new NotFoundError("Usuario no encontrado");
      return toDto(record);
    },
  };
}
