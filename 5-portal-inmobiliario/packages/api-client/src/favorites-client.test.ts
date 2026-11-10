import { afterEach, describe, expect, it, vi } from "vitest";
import { addFavorite, favoritesUrl, fetchFavorites, removeFavorite } from "./favorites-client";
import { ApiRequestError } from "./properties-client";

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("fetchFavorites", () => {
  it("devuelve la lista de favoritas", async () => {
    const fetchMock = stubFetch(Response.json([{ id: "p1" }]));
    expect(await fetchFavorites()).toEqual([{ id: "p1" }]);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(favoritesUrl);
  });

  it("conserva estado y mensaje de la API al fallar", async () => {
    stubFetch(Response.json({ message: "No has iniciado sesión", status: 401 }, { status: 401 }));
    const error = await fetchFavorites().catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 401, message: "No has iniciado sesión" });
  });
});

describe("addFavorite", () => {
  it("usa PUT sobre la propiedad codificada y devuelve su resumen", async () => {
    const fetchMock = stubFetch(Response.json({ id: "a/b" }));
    expect(await addFavorite("a/b")).toEqual({ id: "a/b" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/favorites/a%2Fb");
    expect(init.method).toBe("PUT");
  });

  it("lanza ApiRequestError con 404", async () => {
    stubFetch(Response.json({ message: "Propiedad no encontrada", status: 404 }, { status: 404 }));
    await expect(addFavorite("x")).rejects.toMatchObject({ status: 404 });
  });
});

describe("removeFavorite", () => {
  it("usa DELETE", async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }));
    await removeFavorite("p1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/favorites/p1");
    expect(init.method).toBe("DELETE");
  });

  it("lanza ApiRequestError si falla", async () => {
    stubFetch(new Response(null, { status: 500 }));
    await expect(removeFavorite("p1")).rejects.toBeInstanceOf(ApiRequestError);
  });
});
