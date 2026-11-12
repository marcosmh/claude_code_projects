import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAdminInquiriesUrl, fetchAdminInquiries } from "./admin-inquiries-client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

describe("admin-inquiries-client", () => {
  it("arma la URL solo con los filtros presentes", () => {
    expect(buildAdminInquiriesUrl()).toBe("/api/admin/inquiries?page=1");
    expect(buildAdminInquiriesUrl({ page: 2, search: " casa ", propertyId: "p1" })).toBe(
      "/api/admin/inquiries?page=2&search=casa&propertyId=p1",
    );
  });

  it("devuelve la página", async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [], totalPages: 1 }));
    await expect(fetchAdminInquiries()).resolves.toEqual({ items: [], totalPages: 1 });
  });

  it("lanza ApiRequestError con el mensaje del servidor", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "Prohibido" }, { status: 403 }));
    await expect(fetchAdminInquiries()).rejects.toMatchObject({
      message: "Prohibido",
      status: 403,
    });
  });
});
