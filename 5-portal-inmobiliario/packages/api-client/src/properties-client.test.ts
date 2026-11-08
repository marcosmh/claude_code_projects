import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiRequestError,
  buildPropertiesUrl,
  buildPropertyUrl,
  fetchPropertyDetail,
  fetchPropertyPage,
} from "./properties-client";

describe("buildPropertiesUrl", () => {
  it("devuelve la ruta base sin parámetros", () => {
    expect(buildPropertiesUrl()).toBe("/api/properties");
  });

  it("serializa solo los parámetros definidos", () => {
    expect(buildPropertiesUrl({ operation: "SALE", pageSize: 3 })).toBe(
      "/api/properties?pageSize=3&operation=SALE",
    );
    expect(buildPropertiesUrl({ featured: true, pageSize: 6 })).toBe(
      "/api/properties?pageSize=6&featured=true",
    );
  });
});

describe("buildPropertiesUrl con búsqueda", () => {
  it("codifica el texto y omite búsquedas vacías", () => {
    expect(buildPropertiesUrl({ search: "Mérida centro", page: 2 })).toBe(
      "/api/properties?page=2&search=M%C3%A9rida+centro",
    );
    expect(buildPropertiesUrl({ search: "" })).toBe("/api/properties");
  });
});

describe("buildPropertiesUrl con filtros", () => {
  it("serializa todos los filtros definidos y omite los vacíos", () => {
    expect(
      buildPropertiesUrl({
        type: "HOUSE",
        minPrice: 1000,
        maxPrice: 5000,
        bedrooms: 3,
        bathrooms: 0,
        minUsableArea: 80,
        commune: "Álamos",
        city: "",
        region: "Jalisco",
      }),
    ).toBe(
      "/api/properties?type=HOUSE&minPrice=1000&maxPrice=5000&bedrooms=3&bathrooms=0&minUsableArea=80&commune=%C3%81lamos&region=Jalisco",
    );
  });
});

describe("buildPropertiesUrl con orden", () => {
  it("omite el orden predeterminado y serializa los demás", () => {
    expect(buildPropertiesUrl({ sort: "newest" })).toBe("/api/properties");
    expect(buildPropertiesUrl({ sort: "price_desc" })).toBe("/api/properties?sort=price_desc");
  });
});

describe("fetchPropertyPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("devuelve el JSON cuando la respuesta es correcta", async () => {
    const body = { items: [], page: 1, pageSize: 3, total: 0, totalPages: 0 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body))));
    await expect(fetchPropertyPage("/api/properties")).resolves.toEqual(body);
  });

  it("lanza ApiRequestError con el estado HTTP cuando falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    await expect(fetchPropertyPage("/api/properties")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 500,
    });
    await expect(fetchPropertyPage("/api/properties")).rejects.toBeInstanceOf(ApiRequestError);
  });
});

describe("detalle de propiedad", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("codifica el id en la URL", () => {
    expect(buildPropertyUrl("abc 1/2")).toBe("/api/properties/abc%201%2F2");
  });

  it("devuelve el detalle cuando la respuesta es correcta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "p1" }))));
    expect(await fetchPropertyDetail("/api/properties/p1")).toEqual({ id: "p1" });
  });

  it("propaga el estado 404 como ApiRequestError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    await expect(fetchPropertyDetail("/api/properties/x")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 404,
    });
  });

  it("propaga otros errores del servidor", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 500 })));
    await expect(fetchPropertyDetail("/api/properties/x")).rejects.toBeInstanceOf(ApiRequestError);
  });
});
