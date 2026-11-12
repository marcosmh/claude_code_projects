import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { AdminUserRecord, AdminUserRepository } from "@/repositories/admin-user-repository";
import type {
  AdminUserDto,
  AdminUserListQuery,
  CreateAdminUserInput,
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

type AdminUserServiceDependencies = {
  repository: AdminUserRepository;
  hashPassword(password: string): Promise<string>;
  /** Cuenta que ya usa ese email, o null. */
  findEmailOwner(email: string): Promise<unknown | null>;
};

/** Administración de usuarios para ADMIN. La autorización se aplica en las rutas con `withRole`. */
export function createAdminUserService({
  repository,
  hashPassword,
  findEmailOwner,
}: AdminUserServiceDependencies) {
  return {
    /** Alta de una cuenta activa, normal o de administración. Nunca devuelve la contraseña. */
    async createUser(input: CreateAdminUserInput): Promise<AdminUserDto> {
      if ((await findEmailOwner(input.email)) !== null) {
        throw new ConflictError("Ya existe una cuenta con este email");
      }
      return toDto(
        await repository.create({
          name: input.name,
          email: input.email,
          passwordHash: await hashPassword(input.password),
          role: input.role,
        }),
      );
    },

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
