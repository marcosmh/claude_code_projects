import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("arranque", () => {
  const load = async () => {
    vi.resetModules();
    return import("../src/instrumentation");
  };

  it("el servidor no arranca sin JWT_SECRET o con uno corto, y el error no imprime el secreto", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("JWT_SECRET", "");
    await expect((await load()).register()).rejects.toThrow(/JWT_SECRET/);

    vi.stubEnv("JWT_SECRET", "too-short-secret");
    const error = await (await load()).register().catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain("too-short-secret");
  });

  it("arranca con un secreto de 32 bytes o más", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("JWT_SECRET", "s".repeat(32));
    await expect((await load()).register()).resolves.toBeUndefined();
  });

  it("en producción no arranca con un FRONTEND_ORIGIN inaceptable", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "Zq8vK2mXp4Lr9TnW7yBc3HdF6gJsA1eU");
    vi.stubEnv("JWT_REFRESH_SECRET", "Rt5hN8cV2xMb7QkP4wEj9LsD3fGa6YuZ");
    vi.stubEnv("FRONTEND_ORIGIN", "http://localhost:5173");
    await expect((await load()).register()).rejects.toThrow(/FRONTEND_ORIGIN/);

    vi.stubEnv("FRONTEND_ORIGIN", "https://app.example.com");
    await expect((await load()).register()).resolves.toBeUndefined();
  });

  it("fuera del runtime de Node no valida nada", async () => {
    vi.stubEnv("NEXT_RUNTIME", "edge");
    vi.stubEnv("JWT_SECRET", "");
    await expect((await load()).register()).resolves.toBeUndefined();
  });

  it("la configuración se valida una vez y se reutiliza", async () => {
    vi.stubEnv("JWT_SECRET", "s".repeat(40));
    const { getJwtConfig } = await import("../src/utils/jwt");
    expect(getJwtConfig()).toBe(getJwtConfig());
  });
});

describe("auditoría", () => {
  it("escribe una línea JSON fuera de los tests y solo con los campos permitidos", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { consoleAudit } = await import("../src/utils/audit");
    consoleAudit("login_failed", { userId: 3, reason: "wrong_password" });
    const line = JSON.parse(info.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "info", event: "audit", action: "login_failed", userId: 3, reason: "wrong_password" });
    expect(Object.keys(line).sort()).toEqual(["action", "at", "event", "level", "reason", "userId"]);

    vi.stubEnv("NODE_ENV", "test");
    consoleAudit("logout");
    expect(info).toHaveBeenCalledTimes(1);
  });
});
