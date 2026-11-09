import { SignJWT } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const secret = "x".repeat(40);

beforeEach(() => vi.stubEnv("AUTH_SECRET", secret));
afterEach(() => vi.unstubAllEnvs());

async function signToken(
  options: { secretValue?: string; expiresIn?: string | number; subject?: string } = {},
) {
  const { secretValue = secret, expiresIn = "1h", subject = "user-1" } = options;
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(new TextEncoder().encode(secretValue));
}

describe("sesión firmada", () => {
  it("un token recién creado devuelve el id de usuario", async () => {
    const token = await createSessionToken("user-1");
    expect(await verifySessionToken(token)).toBe("user-1");
  });

  it("no incluye el rol ni datos sensibles en el token", async () => {
    const token = await createSessionToken("user-1");
    const payload = JSON.parse(Buffer.from(token.split(".")[1] as string, "base64url").toString());
    expect(Object.keys(payload).sort()).toEqual(["exp", "iat", "sub"]);
  });

  it("rechaza tokens expirados", async () => {
    const expired = await signToken({ expiresIn: Math.floor(Date.now() / 1000) - 60 });
    expect(await verifySessionToken(expired)).toBeNull();
  });

  it("rechaza tokens firmados con otra clave o alterados", async () => {
    const foreign = await signToken({ secretValue: "y".repeat(40) });
    expect(await verifySessionToken(foreign)).toBeNull();

    const valid = await createSessionToken("user-1");
    const [header, , signature] = valid.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "admin-1" })).toString("base64url");
    expect(await verifySessionToken(`${header}.${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rechaza texto que no es un token y tokens sin sujeto", async () => {
    expect(await verifySessionToken("no-es-un-token")).toBeNull();
    expect(await verifySessionToken(await signToken({ subject: "" }))).toBeNull();
  });

  it("rechaza el algoritmo none", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    expect(await verifySessionToken(`${header}.${payload}.`)).toBeNull();
  });

  it("exige una AUTH_SECRET definida y suficientemente larga", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    await expect(createSessionToken("user-1")).rejects.toThrow("AUTH_SECRET");
    vi.stubEnv("AUTH_SECRET", "corta");
    await expect(createSessionToken("user-1")).rejects.toThrow("AUTH_SECRET");
  });
});
