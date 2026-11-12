import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adminSettingsUrl,
  fetchAdminSettings,
  fetchPublicSettings,
  publicSettingsUrl,
  updateAdminSettings,
} from "./system-settings-client";

const settings = {
  allowRegistration: true,
  defaultCurrency: "MXN",
  contactEmail: null,
  contactPhone: null,
};

afterEach(() => vi.unstubAllGlobals());

describe("clientes de configuración", () => {
  it("lee la configuración pública y la de administración", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => Response.json(settings));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPublicSettings()).resolves.toEqual(settings);
    await expect(fetchAdminSettings()).resolves.toEqual(settings);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      publicSettingsUrl,
      adminSettingsUrl,
    ]);
  });

  it("falla con ApiRequestError y el estado HTTP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response("{}", { status: 403 })),
    );
    await expect(fetchAdminSettings()).rejects.toMatchObject({ status: 403 });
  });

  it("envía PUT con el cuerpo en JSON y devuelve lo guardado", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(settings));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateAdminSettings(settings as never)).resolves.toEqual(settings);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(adminSettingsUrl);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual(settings);
  });

  it("usa el mensaje de la API cuando el PUT falla con 400", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ message: "Datos no válidos", status: 400 }, { status: 400 }),
        ),
    );
    await expect(updateAdminSettings(settings as never)).rejects.toMatchObject({
      message: "Datos no válidos",
      status: 400,
    });
  });
});
