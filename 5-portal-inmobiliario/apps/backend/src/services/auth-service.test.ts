import { describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { UserRecord, UserRepository } from "@/repositories/user-repository";
import { createAuthService, type PasswordHasher } from "./auth-service";

function buildUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: "user-1",
    email: "ana@example.com",
    name: "Ana Pérez",
    role: "USER",
    isActive: true,
    passwordHash: "hash-almacenado",
    ...overrides,
  };
}

function buildRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (data) => buildUser({ ...data, id: "nuevo" })),
    update: vi.fn().mockImplementation(async (id, data) => buildUser({ ...data, id })),
    ...overrides,
  };
}

function buildHasher(overrides: Partial<PasswordHasher> = {}): PasswordHasher {
  return {
    hash: vi.fn().mockResolvedValue("hash-nuevo"),
    verify: vi.fn().mockResolvedValue(true),
    spendVerificationTime: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const registration = { name: "Ana Pérez", email: "ana@example.com", password: "clave-segura-1" };

describe("register", () => {
  it("guarda el hash, nunca la contraseña, y devuelve el usuario sin datos sensibles", async () => {
    const repository = buildRepository();
    const service = createAuthService({ repository, passwordHasher: buildHasher() });

    const user = await service.register(registration);

    expect(repository.create).toHaveBeenCalledWith({
      email: "ana@example.com",
      name: "Ana Pérez",
      passwordHash: "hash-nuevo",
    });
    expect(user).toEqual({
      id: "nuevo",
      email: "ana@example.com",
      name: "Ana Pérez",
      role: "USER",
    });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("lanza ConflictError si el email ya existe y no calcula el hash", async () => {
    const hasher = buildHasher();
    const service = createAuthService({
      repository: buildRepository({ findByEmail: vi.fn().mockResolvedValue(buildUser()) }),
      passwordHasher: hasher,
    });

    await expect(service.register(registration)).rejects.toBeInstanceOf(ConflictError);
    expect(hasher.hash).not.toHaveBeenCalled();
  });

  it("lanza ForbiddenError sin tocar la base cuando el registro está deshabilitado", async () => {
    const repository = buildRepository();
    const hasher = buildHasher();
    const service = createAuthService({
      repository,
      passwordHasher: hasher,
      isRegistrationOpen: async () => false,
    });

    await expect(service.register(registration)).rejects.toThrow(
      "El registro de cuentas está deshabilitado",
    );
    expect(repository.findByEmail).not.toHaveBeenCalled();
    expect(repository.create).not.toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
  });
});

describe("login", () => {
  it("devuelve el usuario cuando las credenciales son correctas", async () => {
    const hasher = buildHasher();
    const service = createAuthService({
      repository: buildRepository({ findByEmail: vi.fn().mockResolvedValue(buildUser()) }),
      passwordHasher: hasher,
    });

    const user = await service.login({ email: "ana@example.com", password: "clave-segura-1" });

    expect(hasher.verify).toHaveBeenCalledWith("clave-segura-1", "hash-almacenado");
    expect(user).toEqual({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana Pérez",
      role: "USER",
    });
  });

  it("usa el mismo error para email desconocido y contraseña incorrecta", async () => {
    const unknownUser = createAuthService({
      repository: buildRepository(),
      passwordHasher: buildHasher(),
    });
    const wrongPassword = createAuthService({
      repository: buildRepository({ findByEmail: vi.fn().mockResolvedValue(buildUser()) }),
      passwordHasher: buildHasher({ verify: vi.fn().mockResolvedValue(false) }),
    });
    const credentials = { email: "ana@example.com", password: "mala" };

    const first = await unknownUser.login(credentials).catch((error: unknown) => error);
    const second = await wrongPassword.login(credentials).catch((error: unknown) => error);

    expect(first).toBeInstanceOf(UnauthorizedError);
    expect(second).toBeInstanceOf(UnauthorizedError);
    expect((first as Error).message).toBe((second as Error).message);
  });

  it("gasta tiempo de verificación cuando el email no existe", async () => {
    const hasher = buildHasher();
    const service = createAuthService({ repository: buildRepository(), passwordHasher: hasher });

    await service.login({ email: "nadie@example.com", password: "x" }).catch(() => undefined);

    expect(hasher.spendVerificationTime).toHaveBeenCalledWith("x");
    expect(hasher.verify).not.toHaveBeenCalled();
  });

  it("rechaza cuentas inactivas con ForbiddenError solo si la contraseña es correcta", async () => {
    const inactive = buildUser({ isActive: false });
    const correct = createAuthService({
      repository: buildRepository({ findByEmail: vi.fn().mockResolvedValue(inactive) }),
      passwordHasher: buildHasher(),
    });
    const incorrect = createAuthService({
      repository: buildRepository({ findByEmail: vi.fn().mockResolvedValue(inactive) }),
      passwordHasher: buildHasher({ verify: vi.fn().mockResolvedValue(false) }),
    });
    const credentials = { email: "ana@example.com", password: "clave" };

    await expect(correct.login(credentials)).rejects.toBeInstanceOf(ForbiddenError);
    await expect(incorrect.login(credentials)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe("getCurrentUser", () => {
  it("devuelve el usuario activo", async () => {
    const service = createAuthService({
      repository: buildRepository({ findById: vi.fn().mockResolvedValue(buildUser()) }),
      passwordHasher: buildHasher(),
    });
    expect(await service.getCurrentUser("user-1")).toMatchObject({ id: "user-1", role: "USER" });
  });

  it("invalida la sesión si el usuario no existe o está desactivado", async () => {
    for (const record of [null, buildUser({ isActive: false })]) {
      const service = createAuthService({
        repository: buildRepository({ findById: vi.fn().mockResolvedValue(record) }),
        passwordHasher: buildHasher(),
      });
      await expect(service.getCurrentUser("user-1")).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });
});

describe("updateProfile", () => {
  const edit = { name: "Ana M. Pérez", email: "ana@example.com" };

  function buildService(
    repositoryOverrides: Partial<UserRepository> = {},
    hasherOverrides: Partial<PasswordHasher> = {},
  ) {
    const repository = buildRepository({
      findById: vi.fn().mockResolvedValue(buildUser()),
      ...repositoryOverrides,
    });
    const passwordHasher = buildHasher(hasherOverrides);
    return {
      repository,
      passwordHasher,
      service: createAuthService({ repository, passwordHasher }),
    };
  }

  it("cambia solo el nombre sin pedir contraseña ni tocar el hash", async () => {
    const { service, repository, passwordHasher } = buildService();

    const user = await service.updateProfile("user-1", edit);

    expect(repository.update).toHaveBeenCalledWith("user-1", {
      name: "Ana M. Pérez",
      email: "ana@example.com",
    });
    expect(passwordHasher.verify).not.toHaveBeenCalled();
    expect(user).toEqual({
      id: "user-1",
      email: "ana@example.com",
      name: "Ana M. Pérez",
      role: "USER",
    });
  });

  it("cambia el email con la contraseña actual correcta", async () => {
    const { service, repository } = buildService();
    await service.updateProfile("user-1", {
      ...edit,
      email: "nueva@example.com",
      currentPassword: "clave-segura-1",
    });
    expect(repository.update).toHaveBeenCalledWith("user-1", {
      name: "Ana M. Pérez",
      email: "nueva@example.com",
    });
  });

  it("exige la contraseña actual para cambiar el email", async () => {
    const { service, repository } = buildService();
    await expect(
      service.updateProfile("user-1", { ...edit, email: "nueva@example.com" }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("rechaza una contraseña actual incorrecta", async () => {
    const { service, repository } = buildService({}, { verify: vi.fn().mockResolvedValue(false) });
    await expect(
      service.updateProfile("user-1", {
        ...edit,
        email: "nueva@example.com",
        currentPassword: "equivocada",
      }),
    ).rejects.toMatchObject({ message: "La contraseña actual no es correcta" });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("guarda el hash de la nueva contraseña, nunca el texto", async () => {
    const { service, repository, passwordHasher } = buildService();
    await service.updateProfile("user-1", {
      ...edit,
      currentPassword: "clave-segura-1",
      newPassword: "clave-nueva-123",
    });
    expect(passwordHasher.verify).toHaveBeenCalledWith("clave-segura-1", "hash-almacenado");
    expect(passwordHasher.hash).toHaveBeenCalledWith("clave-nueva-123");
    expect(repository.update).toHaveBeenCalledWith("user-1", {
      name: "Ana M. Pérez",
      email: "ana@example.com",
      passwordHash: "hash-nuevo",
    });
  });

  it("lanza ConflictError si el email pertenece a otra cuenta", async () => {
    const { service, repository } = buildService({
      findByEmail: vi.fn().mockResolvedValue(buildUser({ id: "otro" })),
    });
    await expect(
      service.updateProfile("user-1", {
        ...edit,
        email: "ocupado@example.com",
        currentPassword: "clave-segura-1",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("lanza UnauthorizedError si la cuenta ya no existe o está desactivada", async () => {
    for (const found of [null, buildUser({ isActive: false })]) {
      const { service } = buildService({ findById: vi.fn().mockResolvedValue(found) });
      await expect(service.updateProfile("user-1", edit)).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });
});
