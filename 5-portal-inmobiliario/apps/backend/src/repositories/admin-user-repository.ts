import "server-only";
import { Prisma, type User } from "@/generated/prisma/client";
import { ConflictError } from "@/lib/errors";
import { database } from "@/lib/database/client";
import type { AdminUserStatus } from "@portal/shared-types";

export type AdminUserRecord = User & { _count: { favorites: number; inquiries: number } };

export type AdminUserPageOptions = {
  skip: number;
  take: number;
  searchText?: string;
  role?: "USER" | "ADMIN";
  status: AdminUserStatus;
};

export type AdminUserRepository = {
  findPage(options: AdminUserPageOptions): Promise<{ records: AdminUserRecord[]; total: number }>;
  findById(userId: string): Promise<AdminUserRecord | null>;
  /** Crea una cuenta activa con el rol indicado. Lanza ConflictError si el email ya existe. */
  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: "USER" | "ADMIN";
  }): Promise<AdminUserRecord>;
  /** null si el usuario no existe. */
  update(
    userId: string,
    data: { isActive?: boolean; role?: "USER" | "ADMIN" },
  ): Promise<AdminUserRecord | null>;
};

const countInclude = { _count: { select: { favorites: true, inquiries: true } } } as const;

async function buildWhere({
  searchText,
  role,
  status,
}: Pick<AdminUserPageOptions, "searchText" | "role" | "status">): Promise<Prisma.UserWhereInput> {
  const where: Prisma.UserWhereInput = {};
  if (role) where.role = role;
  if (status !== "all") where.isActive = status === "active";
  if (searchText) {
    // unaccent + ILIKE no se expresa en Prisma: se resuelven los ids por SQL.
    const pattern = `%${searchText.replace(/[\\%_]/g, "\\$&")}%`;
    const rows = await database.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "users"
      WHERE unaccent("name") ILIKE unaccent(${pattern}) OR unaccent("email") ILIKE unaccent(${pattern})`;
    where.id = { in: rows.map((row) => row.id) };
  }
  return where;
}

export const adminUserRepository: AdminUserRepository = {
  async findPage({ skip, take, searchText, role, status }) {
    const where = await buildWhere({ searchText, role, status });
    const [records, total] = await Promise.all([
      database.user.findMany({
        where,
        include: countInclude,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip,
        take,
      }),
      database.user.count({ where }),
    ]);
    return { records, total };
  },

  findById(userId) {
    return database.user.findUnique({ where: { id: userId }, include: countInclude });
  },

  async create(data) {
    try {
      return await database.user.create({ data, include: countInclude });
    } catch (error) {
      // La restricción única de User.email resuelve también la carrera entre dos altas.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Ya existe una cuenta con este email");
      }
      throw error;
    }
  },

  async update(userId, data) {
    const { count } = await database.user.updateMany({ where: { id: userId }, data });
    if (count === 0) return null;
    return database.user.findUnique({ where: { id: userId }, include: countInclude });
  },
};
