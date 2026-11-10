import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchInquiredProperties, inquiredPropertiesUrl } from "./inquiries-client";
import { ApiRequestError } from "./properties-client";

afterEach(() => vi.unstubAllGlobals());

describe("fetchInquiredProperties", () => {
  it("devuelve las propiedades consultadas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([{ id: "p1" }]));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchInquiredProperties()).toEqual([{ id: "p1" }]);
    expect((fetchMock.mock.calls[0] as [string])[0]).toBe(inquiredPropertiesUrl);
  });

  it("lanza ApiRequestError con el estado de la API al fallar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const error = await fetchInquiredProperties().catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 401 });
  });
});
