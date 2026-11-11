import { afterEach, describe, expect, it, vi } from "vitest";
import { buildUserInquiriesUrl, deleteInquiry, fetchUserInquiries } from "./inquiries-client";
import { ApiRequestError } from "./properties-client";

afterEach(() => vi.unstubAllGlobals());

describe("fetchUserInquiries", () => {
  it("devuelve las consultas del usuario", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [{ id: "i1" }] }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchUserInquiries()).toEqual({ items: [{ id: "i1" }] });
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe("/api/inquiries/mine?page=1");
  });

  it("lanza ApiRequestError con el estado de la API al fallar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const error = await fetchUserInquiries().catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 401 });
  });
});

describe("buildUserInquiriesUrl", () => {
  it("incluye página y búsqueda recortada", () => {
    expect(buildUserInquiriesUrl({ page: 2, searchText: "  casa " })).toBe(
      "/api/inquiries/mine?page=2&q=casa",
    );
  });

  it("omite la búsqueda vacía", () => {
    expect(buildUserInquiriesUrl({ searchText: "   " })).toBe("/api/inquiries/mine?page=1");
  });
});

describe("deleteInquiry", () => {
  it("envía DELETE a la consulta indicada", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await deleteInquiry("i 1");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/inquiries/i%201");
    expect(init.method).toBe("DELETE");
  });

  it("lanza ApiRequestError si la API responde un error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    const error = await deleteInquiry("x").catch((caught) => caught);
    expect(error).toMatchObject({ status: 404 });
  });
});
