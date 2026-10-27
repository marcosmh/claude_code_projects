import { describe, expect, it, vi } from "vitest";
import { AuthController } from "../src/controllers/AuthController";
import type { AuthService } from "../src/services/AuthService";
import { UnauthorizedError } from "../src/utils/errors";
import { EMAIL_LOGIN_LIMIT, RateLimiter } from "../src/utils/rateLimit";

const login = (email: string) =>
  new Request("http://localhost:4000/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "whatever-password" }),
  });

// The service always fails, as it does for an unknown account: the limit must not depend on the account existing.
const makeController = (disabled = false) => {
  const service = { login: vi.fn().mockRejectedValue(new UnauthorizedError("nope")) };
  const controller = new AuthController(service as unknown as AuthService, new RateLimiter(), disabled);
  return { controller, service };
};

describe("login: límite por email", () => {
  it("tras el límite responde 429 RATE_LIMITED con Retry-After, sin llamar al servicio", async () => {
    const { controller, service } = makeController();
    for (let i = 0; i < EMAIL_LOGIN_LIMIT; i++) {
      await expect(controller.login(login("victim@example.com"))).rejects.toBeInstanceOf(UnauthorizedError);
    }
    await expect(controller.login(login("victim@example.com"))).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
    expect(service.login).toHaveBeenCalledTimes(EMAIL_LOGIN_LIMIT);
  });

  it("normaliza el email (mayúsculas/espacios) y no depende de que exista", async () => {
    const { controller } = makeController();
    for (let i = 0; i < EMAIL_LOGIN_LIMIT; i++) await controller.login(login(i % 2 ? " Ghost@Example.com " : "ghost@example.com")).catch(() => {});
    await expect(controller.login(login("GHOST@example.com"))).rejects.toMatchObject({ status: 429 });
  });

  it("otro email conserva su propio cupo", async () => {
    const { controller } = makeController();
    for (let i = 0; i < EMAIL_LOGIN_LIMIT + 2; i++) await controller.login(login("a@example.com")).catch(() => {});
    await expect(controller.login(login("b@example.com"))).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("con el límite desactivado (solo E2E) no bloquea", async () => {
    const { controller } = makeController(true);
    for (let i = 0; i < EMAIL_LOGIN_LIMIT + 3; i++) {
      await expect(controller.login(login("a@example.com"))).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });
});
