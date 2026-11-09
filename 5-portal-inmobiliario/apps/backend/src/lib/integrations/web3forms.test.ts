import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { web3FormsNotifier } from "./web3forms";

const notification = {
  name: "Ana",
  email: "ana@example.com",
  message: "Hola, me interesa",
  propertyId: "p1",
  propertyTitle: "Casa en Mérida",
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("web3FormsNotifier", () => {
  it("envía la consulta con la clave, el id y el título de la propiedad", async () => {
    vi.stubEnv("WEB3FORMS_ACCESS_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal("fetch", fetchMock);

    expect(await web3FormsNotifier.send(notification)).toBe(true);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.web3forms.com/submit");
    expect(JSON.parse(init.body as string)).toMatchObject({
      access_key: "secret-key",
      property_id: "p1",
      property_title: "Casa en Mérida",
      email: "ana@example.com",
    });
  });

  it("devuelve false sin lanzar cuando falta la clave", async () => {
    vi.stubEnv("WEB3FORMS_ACCESS_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await web3FormsNotifier.send(notification)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve false si Web3Forms rechaza el envío", async () => {
    vi.stubEnv("WEB3FORMS_ACCESS_KEY", "k");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 400 })),
    );
    expect(await web3FormsNotifier.send(notification)).toBe(false);
  });

  it("devuelve false ante errores de red", async () => {
    vi.stubEnv("WEB3FORMS_ACCESS_KEY", "k");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await web3FormsNotifier.send(notification)).toBe(false);
  });
});
