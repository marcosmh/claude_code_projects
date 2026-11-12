import { describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import type { AdminUserRepository } from "@/repositories/admin-user-repository";
import { createAdminUserService } from "./admin-user-service";

const record = (overrides = {}) => ({
  id: "u1",
  email: "a@example.com",
  passwordHash: "secreto",
  name: "Ana",
  role: "USER" as const,
  isActive: true,
  createdAt: new Date("2026-01-02T00:00:00Z"),
  updatedAt: new Date(),
  _count: { favorites: 2, inquiries: 1 },
  ...overrides,
});

function build(found: ReturnType<typeof record> | null = record(), emailTaken = false) {
  const repository: AdminUserRepository = {
    findPage: vi.fn().mockResolvedValue({ records: [record()], total: 25 }),
    findById: vi.fn().mockResolvedValue(found),
    update: vi.fn().mockResolvedValue(found),
    create: vi.fn().mockImplementation(async (data) => record({ ...data })),
  };
  const hashPassword = vi.fn().mockResolvedValue("hash-seguro");
  const findEmailOwner = vi.fn().mockResolvedValue(emailTaken ? { id: "otro" } : null);
  return {
    service: createAdminUserService({ repository, hashPassword, findEmailOwner }),
    repository,
    hashPassword,
  };
}

describe("createAdminUserService", () => {
  it("lista paginado sin exponer el hash", async () => {
    const { service, repository } = build();
    const result = await service.listUsers({
      page: 2,
      pageSize: 10,
      status: "active",
      search: "ana",
    });
    expect(repository.findPage).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      status: "active",
      searchText: "ana",
    });
    expect(result).toMatchObject({ page: 2, total: 25, totalPages: 3 });
    expect(result.items[0]).toEqual({
      id: "u1",
      name: "Ana",
      email: "a@example.com",
      role: "USER",
      isActive: true,
      createdAt: "2026-01-02T00:00:00.000Z",
      favoritesCount: 2,
      inquiriesCount: 1,
    });
    expect(JSON.stringify(result)).not.toContain("secreto");
  });

  it("devuelve el detalle o no encontrado", async () => {
    await expect(build().service.getUser("u1")).resolves.toMatchObject({ id: "u1" });
    await expect(build(null).service.getUser("x")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("actualiza solo los campos indicados", async () => {
    const { service, repository } = build();
    await service.updateUser("admin", "u1", { isActive: false });
    expect(repository.update).toHaveBeenCalledWith("u1", { isActive: false });
    await service.updateUser("admin", "u1", { role: "ADMIN" });
    expect(repository.update).toHaveBeenLastCalledWith("u1", { role: "ADMIN" });
  });

  it("no permite que un ADMIN se modifique a sí mismo", async () => {
    const { service, repository } = build();
    await expect(service.updateUser("u1", "u1", { isActive: false })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("responde no encontrado si el usuario no existe", async () => {
    await expect(
      build(null).service.updateUser("admin", "x", { role: "ADMIN" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("createUser", () => {
  const input = { name: "Nuevo", email: "nuevo@example.com", password: "clave-segura-1" };

  it("crea la cuenta con el rol indicado y la contraseña con hash", async () => {
    const { service, repository, hashPassword } = build();
    const result = await service.createUser({ ...input, role: "ADMIN" });
    expect(hashPassword).toHaveBeenCalledWith("clave-segura-1");
    expect(repository.create).toHaveBeenCalledWith({
      name: "Nuevo",
      email: "nuevo@example.com",
      passwordHash: "hash-seguro",
      role: "ADMIN",
    });
    expect(result).toMatchObject({ email: "nuevo@example.com", role: "ADMIN" });
    expect(JSON.stringify(result)).not.toContain("hash-seguro");
  });

  it("rechaza un email que ya existe sin crear nada", async () => {
    const { service, repository } = build(record(), true);
    await expect(service.createUser({ ...input, role: "USER" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
