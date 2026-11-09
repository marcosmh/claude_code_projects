import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { ConflictError } from "@/lib/errors";
import { database } from "@/lib/database/client";
import type { UserRole } from "@portal/shared-types";

export type UserRecord = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  passwordHash: string;
};

export type CreateUserData = {
  email: string;
  name: string;
  passwordHash: string;
};

export type UserRepository = {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  /** Crea siempre un USER activo. Lanza ConflictError si el email ya existe. */
  create(data: CreateUserData): Promise<UserRecord>;
};

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  passwordHash: true,
} as const;

export const userRepository: UserRepository = {
  findByEmail(email) {
    return database.user.findUnique({ where: { email }, select: userSelect });
  },

  findById(id) {
    return database.user.findUnique({ where: { id }, select: userSelect });
  },

  async create(data) {
    try {
      return await database.user.create({
        data: { email: data.email, name: data.name, passwordHash: data.passwordHash },
        select: userSelect,
      });
    } catch (error) {
      // La restricción única de User.email resuelve la carrera entre dos registros simultáneos.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Ya existe una cuenta con este email");
      }
      throw error;
    }
  },
};
