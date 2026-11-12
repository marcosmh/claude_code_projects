import { describe, expect, it, vi } from "vitest";
import { BadGatewayError, ServiceUnavailableError } from "@/lib/errors";
import {
  createCloudinaryStorage,
  DEFAULT_CLOUDINARY_FOLDER,
  loadCloudinaryConfig,
  signParameters,
  type CloudinaryConfig,
} from "./cloudinary-storage";

const config: CloudinaryConfig = {
  cloudName: "demo",
  apiKey: "key-123",
  apiSecret: "secret-xyz",
  folder: "propiedades-claude",
};
const FIXED_NOW = 1_700_000_000_000;

function buildStorage(
  response: Response | Error,
  overrides: { config?: CloudinaryConfig | null } = {},
) {
  const fetchImplementation = vi.fn().mockImplementation(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const storage = createCloudinaryStorage({
    getConfig: () => (overrides.config === undefined ? config : overrides.config),
    fetchImplementation,
    now: () => FIXED_NOW,
  });
  return { storage, fetchImplementation };
}

const file = {
  bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  contentType: "image/jpeg",
  filename: "casa.jpg",
};

describe("signParameters", () => {
  it("coincide con el ejemplo de la documentación de Cloudinary", () => {
    expect(
      signParameters(
        {
          timestamp: "1315060510",
          public_id: "sample_image",
          eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
        },
        "abcd",
      ),
    ).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });
});

describe("loadCloudinaryConfig", () => {
  it("devuelve null si falta alguna credencial", () => {
    expect(loadCloudinaryConfig({})).toBeNull();
    expect(
      loadCloudinaryConfig({ CLOUDINARY_CLOUD_NAME: "a", CLOUDINARY_API_KEY: "b" }),
    ).toBeNull();
  });

  it("usa la carpeta propiedades-claude por defecto y permite cambiarla", () => {
    const env = {
      CLOUDINARY_CLOUD_NAME: " demo ",
      CLOUDINARY_API_KEY: "key",
      CLOUDINARY_API_SECRET: "secret",
    };
    expect(loadCloudinaryConfig(env)).toEqual({
      cloudName: "demo",
      apiKey: "key",
      apiSecret: "secret",
      folder: "propiedades-claude",
    });
    expect(DEFAULT_CLOUDINARY_FOLDER).toBe("propiedades-claude");
    expect(loadCloudinaryConfig({ ...env, CLOUDINARY_FOLDER: "otra" })?.folder).toBe("otra");
  });
});

describe("createCloudinaryStorage.upload", () => {
  it("sube firmado a la carpeta y devuelve la URL y el publicId", async () => {
    const { storage, fetchImplementation } = buildStorage(
      Response.json({
        secure_url: "https://res.cloudinary.com/demo/image/upload/v1/propiedades-claude/abc.jpg",
        public_id: "propiedades-claude/abc",
      }),
    );

    const stored = await storage.upload(file);

    expect(stored).toEqual({
      url: "https://res.cloudinary.com/demo/image/upload/v1/propiedades-claude/abc.jpg",
      publicId: "propiedades-claude/abc",
    });
    const [url, init] = fetchImplementation.mock.calls[0] as [string, { body: FormData }];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(init.body.get("folder")).toBe("propiedades-claude");
    expect(init.body.get("api_key")).toBe("key-123");
    expect(init.body.get("timestamp")).toBe("1700000000");
    expect(init.body.get("signature")).toBe(
      signParameters({ folder: "propiedades-claude", timestamp: "1700000000" }, "secret-xyz"),
    );
    expect(init.body.get("file")).toBeInstanceOf(Blob);
    // El secreto nunca viaja en la solicitud.
    expect([...init.body.values()].map(String)).not.toContain("secret-xyz");
  });

  it("responde 503 sin credenciales", async () => {
    const { storage, fetchImplementation } = buildStorage(Response.json({}), { config: null });
    await expect(storage.upload(file)).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("traduce los fallos de Cloudinary a 502", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    for (const response of [
      Response.json({ error: { message: "Invalid Signature" } }, { status: 401 }),
      Response.json({ unexpected: true }),
      new Error("sin red"),
    ]) {
      const { storage } = buildStorage(response);
      await expect(storage.upload(file)).rejects.toBeInstanceOf(BadGatewayError);
    }
    error.mockRestore();
  });
});

describe("createCloudinaryStorage.remove", () => {
  it("elimina por publicId con firma y acepta «not found»", async () => {
    const { storage, fetchImplementation } = buildStorage(Response.json({ result: "not found" }));
    await storage.remove("propiedades-claude/abc");

    const [url, init] = fetchImplementation.mock.calls[0] as [string, { body: URLSearchParams }];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/destroy");
    expect(init.body.get("public_id")).toBe("propiedades-claude/abc");
    expect(init.body.get("signature")).toBe(
      signParameters(
        { public_id: "propiedades-claude/abc", timestamp: "1700000000" },
        "secret-xyz",
      ),
    );
  });

  it("falla con 502 si Cloudinary rechaza la eliminación", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { storage } = buildStorage(Response.json({ result: "error" }));
    await expect(storage.remove("x")).rejects.toBeInstanceOf(BadGatewayError);
    error.mockRestore();
  });
});
