import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { ConfigError } from "../src/domain/types.js";

const URL_OK = "postgresql://user:secret@host.example:5432/postgres";

describe("loadConfig", () => {
  it("usa el schema public por defecto y conserva la URL", () => {
    expect(loadConfig({ DATABASE_URL: URL_OK })).toEqual({ connectionString: URL_OK, schema: "public", ownerEmail: undefined });
  });

  it("saca ?schema= de la URL (el driver pg no lo conoce) y lo devuelve aparte", () => {
    const config = loadConfig({ DATABASE_URL: `${URL_OK}?schema=scratch_x&sslmode=require` });
    expect(config.schema).toBe("scratch_x");
    expect(config.connectionString).toBe(`${URL_OK}?sslmode=require`);
  });

  it("normaliza el email del dueño", () => {
    expect(loadConfig({ DATABASE_URL: URL_OK, INVOICES_OWNER_EMAIL: "  Ana@Example.com " }).ownerEmail).toBe("ana@example.com");
    expect(loadConfig({ DATABASE_URL: URL_OK, INVOICES_OWNER_EMAIL: " " }).ownerEmail).toBeUndefined();
  });

  it.each([{}, { DATABASE_URL: "  " }])("falla si falta DATABASE_URL", (env) => {
    expect(() => loadConfig(env)).toThrow(ConfigError);
  });

  it("rechaza lo que no es una URL PostgreSQL ni un schema válido, sin repetir la URL en el mensaje", () => {
    const bad = ["no es url", "mysql://u:secret@h/db", `${URL_OK}?schema=a;drop`];
    for (const DATABASE_URL of bad) {
      expect(() => loadConfig({ DATABASE_URL })).toThrow(ConfigError);
      expect(() => loadConfig({ DATABASE_URL })).not.toThrow(/secret/);
    }
  });
});
