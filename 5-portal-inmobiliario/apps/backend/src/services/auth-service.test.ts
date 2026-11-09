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
