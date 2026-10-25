import { afterEach, describe, expect, it, vi } from "vitest";
import { errorResponse } from "../src/utils/http";

function prismaError(code: string, message = "Invalid invocation: clientName: 'Maria Perez'") {
  const e = new Error(message) as Error & { code: string };
  e.name = "PrismaClientKnownRequestError";
  e.code = code;
  return e;
}

afterEach(() => vi.restoreAllMocks());

describe("errorResponse", () => {
  it("P2025 -> 404 y P2002 -> 409, sin exponer el mensaje de Prisma", async () => {
    const notFound = errorResponse(prismaError("P2025"));
    expect(notFound.status).toBe(404);
    expect(JSON.stringify(await notFound.json())).not.toContain("Maria");
    const conflict = errorResponse(prismaError("P2002"));
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).error.code).toBe("CONFLICT");
  });

  it("un error inesperado -> 500 genérico con X-Request-Id", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("boom con datos: ana@correo.com"));
    expect(res.status).toBe(500);
    expect(res.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(await res.json())).not.toContain("ana@correo.com");
  });

  it("el log es JSON con el requestId y sin el mensaje del error (posible PII)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(prismaError("P2003", "FK fail for 'Maria Perez' maria@correo.com"));
    expect(res.status).toBe(500);
    const line = String(spy.mock.calls[0][0]);
    const log = JSON.parse(line);
    expect(log).toMatchObject({ level: "error", name: "PrismaClientKnownRequestError", code: "P2003" });
    expect(log.requestId).toBe(res.headers.get("X-Request-Id"));
    expect(line).not.toContain("Maria");
    expect(line).not.toContain("maria@correo.com");
  });

  it("un valor que no es Error tampoco rompe el manejador", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(errorResponse("texto").status).toBe(500);
  });
});
