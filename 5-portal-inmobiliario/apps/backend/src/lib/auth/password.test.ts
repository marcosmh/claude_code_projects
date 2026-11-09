import { describe, expect, it } from "vitest";
import { hashPassword, spendVerificationTime, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("genera un hash con formato versionado que no contiene la contraseña", async () => {
    const hash = await hashPassword("clave-segura-1");
    const [prefix, cost, blockSize, parallelism, salt, key] = hash.split("$");

    expect(prefix).toBe("scrypt");
    expect([cost, blockSize, parallelism]).toEqual(["32768", "8", "1"]);
    expect(salt).toBeTruthy();
    expect(key).toBeTruthy();
    expect(hash).not.toContain("clave-segura-1");
  });

  it("usa una sal distinta en cada llamada", async () => {
    const [first, second] = await Promise.all([hashPassword("misma"), hashPassword("misma")]);
    expect(first).not.toBe(second);
  });
});

describe("verifyPassword", () => {
  it("acepta la contraseña correcta y rechaza una incorrecta", async () => {
    const hash = await hashPassword("clave-segura-1");
    expect(await verifyPassword("clave-segura-1", hash)).toBe(true);
    expect(await verifyPassword("clave-segura-2", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("trata igual las formas equivalentes de Unicode", async () => {
    // "é" precompuesta frente a "e" + acento combinante: el teclado puede producir cualquiera.
    const hash = await hashPassword("clave-\u00e9");
    expect(await verifyPassword("clave-e\u0301", hash)).toBe(true);
  });

  it("rechaza hashes mal formados sin lanzar", async () => {
    for (const invalid of ["", "texto-plano", "bcrypt$10$abc$def", "scrypt$32768$8$1$solo-sal"]) {
      expect(await verifyPassword("clave", invalid)).toBe(false);
    }
  });

  it("rechaza hashes con parámetros distintos a los actuales", async () => {
    const hash = await hashPassword("clave-segura-1");
    const [prefix, , blockSize, parallelism, salt, key] = hash.split("$");
    const tampered = [prefix, "1048576", blockSize, parallelism, salt, key].join("$");
    expect(await verifyPassword("clave-segura-1", tampered)).toBe(false);
  });
});

describe("spendVerificationTime", () => {
  it("se resuelve sin devolver información", async () => {
    await expect(spendVerificationTime("cualquiera")).resolves.toBeUndefined();
  });
});
