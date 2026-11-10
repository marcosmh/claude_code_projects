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

export type UpdateUserData = {
  name: string;
  email: string;
  /** Solo se indica cuando se cambia la contraseña. */
  passwordHash?: string;
};

export type UserRepository = {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  /** Crea siempre un USER activo. Lanza ConflictError si el email ya existe. */
  create(data: CreateUserData): Promise<UserRecord>;
  /** Actualiza solo los datos del perfil (nunca rol ni estado). Lanza ConflictError si el email es de otra cuenta. */
  update(id: string, data: UpdateUserData): Promise<UserRecord>;
};

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  passwordHash: true,
} as const;

/** La restricción única de User.email resuelve la carrera entre dos cambios o registros simultáneos. */
function rethrowEmailConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ConflictError("Ya existe una cuenta con este email");
  }
  throw error;
}

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
      rethrowEmailConflict(error);
    }
  },

  async update(id, data) {
    try {
      return await database.user.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          ...(data.passwordHash === undefined ? {} : { passwordHash: data.passwordHash }),
        },
        select: userSelect,
      });
    } catch (error) {
      rethrowEmailConflict(error);
    }
  },
};
