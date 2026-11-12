import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAdminFeature,
  fetchAdminFeatures,
  setPropertyFeatures,
} from "./admin-features-client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

describe("admin-features-client", () => {
  it("lista el catálogo", async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: "f1" }]));
    await expect(fetchAdminFeatures()).resolves.toEqual([{ id: "f1" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/features");
  });

  it("crea con el nombre en el cuerpo", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "f2" }, { status: 201 }));
    await createAdminFeature("Piscina");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"name":"Piscina"}');
  });

  it("guarda el conjunto de una propiedad", async () => {
    fetchMock.mockResolvedValue(Response.json([]));
    await setPropertyFeatures("p 1", ["f1", "f2"]);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/properties/p%201/features");
    expect(init.method).toBe("PUT");
    expect(init.body).toBe('{"featureIds":["f1","f2"]}');
  });

  it("lanza ApiRequestError con el mensaje del servidor", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "Ya existe" }, { status: 409 }));
    await expect(createAdminFeature("x")).rejects.toMatchObject({
      message: "Ya existe",
      status: 409,
    });
  });
});
