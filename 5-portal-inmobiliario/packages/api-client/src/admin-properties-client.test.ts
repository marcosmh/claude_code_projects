import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAdminPropertiesUrl,
  createAdminProperty,
  deleteAdminProperty,
  fetchAdminProperties,
  fetchAdminProperty,
  updateAdminProperty,
} from "./admin-properties-client";
import { ApiRequestError } from "./properties-client";
import type { PropertyInput } from "@portal/shared-types";

afterEach(() => vi.unstubAllGlobals());

const input = { title: "Casa" } as unknown as PropertyInput;

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("buildAdminPropertiesUrl", () => {
  it("incluye página, búsqueda recortada y estado distinto de all", () => {
    expect(buildAdminPropertiesUrl({ page: 2, search: " casa ", status: "draft" })).toBe(
      "/api/admin/properties?page=2&search=casa&status=draft",
    );
    expect(buildAdminPropertiesUrl()).toBe("/api/admin/properties?page=1");
    expect(buildAdminPropertiesUrl({ pageSize: 5, status: "published" })).toBe(
      "/api/admin/properties?page=1&pageSize=5&status=published",
    );
  });
});

describe("cliente de propiedades de administración", () => {
  it("lista y obtiene propiedades", async () => {
    stubFetch(Response.json({ items: [] }));
    expect(await fetchAdminProperties()).toEqual({ items: [] });
    const fetchMock = stubFetch(Response.json({ id: "p 1" }));
    await fetchAdminProperty("p 1");
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("/api/admin/properties/p%201");
  });

  it("crea con POST y cuerpo JSON", async () => {
    const fetchMock = stubFetch(Response.json({ id: "p1" }, { status: 201 }));
    expect(await createAdminProperty(input)).toEqual({ id: "p1" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/properties");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify(input));
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("actualiza con PUT", async () => {
    const fetchMock = stubFetch(Response.json({ id: "p1" }));
    await updateAdminProperty("p1", input);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/properties/p1");
    expect(init.method).toBe("PUT");
  });

  it("elimina con DELETE y acepta 204", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    await expect(deleteAdminProperty("p1")).resolves.toBeUndefined();
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("DELETE");
  });

  it("lanza ApiRequestError con el mensaje y estado de la API", async () => {
    stubFetch(Response.json({ message: "Propiedad no encontrada", status: 404 }, { status: 404 }));
    const error = await deleteAdminProperty("x").catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 404, message: "Propiedad no encontrada" });
  });
});

describe("buildAdminPropertiesUrl: filtros avanzados", () => {
  it("serializa operación, tipo, estado, precio y fechas", () => {
    expect(
      buildAdminPropertiesUrl({
        operation: ["SALE", "RENT"],
        type: ["HOUSE"],
        availability: ["SOLD"],
        minPrice: 1000,
        maxPrice: 5000,
        publishedFrom: "2026-01-01",
        publishedTo: "2026-02-01",
      }),
    ).toBe(
      "/api/admin/properties?page=1&operation=SALE%2CRENT&type=HOUSE&availability=SOLD&minPrice=1000&maxPrice=5000&publishedFrom=2026-01-01&publishedTo=2026-02-01",
    );
    expect(buildAdminPropertiesUrl({ operation: [], availability: [] })).toBe(
      "/api/admin/properties?page=1",
    );
  });
});
