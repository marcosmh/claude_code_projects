import "server-only";
import { Prisma, type User } from "@/generated/prisma/client";
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

  async update(userId, data) {
    const { count } = await database.user.updateMany({ where: { id: userId }, data });
    if (count === 0) return null;
    return database.user.findUnique({ where: { id: userId }, include: countInclude });
  },
};
