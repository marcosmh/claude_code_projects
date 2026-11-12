import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAdminUsersUrl,
  createAdminUser,
  fetchAdminUser,
  fetchAdminUsers,
  updateAdminUser,
} from "./admin-users-client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

describe("admin-users-client", () => {
  it("arma la URL solo con los filtros presentes", () => {
    expect(buildAdminUsersUrl()).toBe("/api/admin/users?page=1");
    expect(
      buildAdminUsersUrl({ page: 2, search: " ana ", role: "ADMIN", status: "inactive" }),
    ).toBe("/api/admin/users?page=2&search=ana&role=ADMIN&status=inactive");
  });

  it("lista y consulta usuarios", async () => {
    fetchMock.mockImplementation(async () => Response.json({ items: [] }));
    await fetchAdminUsers();
    await fetchAdminUser("u 1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/users?page=1");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/users/u%201");
  });

  it("actualiza con PATCH y cuerpo JSON", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "u1" }));
    await updateAdminUser("u1", { isActive: false });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"isActive":false}');
  });

  it("lanza ApiRequestError con el mensaje del servidor", async () => {
    fetchMock.mockResolvedValue(Response.json({ message: "No puedes" }, { status: 403 }));
    await expect(updateAdminUser("u1", { role: "USER" })).rejects.toMatchObject({
      message: "No puedes",
      status: 403,
    });
  });

  it("da de alta con POST y cuerpo JSON", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "u9" }, { status: 201 }));
    await expect(
      createAdminUser({
        name: "Ana",
        email: "a@example.com",
        password: "clave-segura-1",
        role: "ADMIN",
      }),
    ).resolves.toEqual({ id: "u9" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/users");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ role: "ADMIN" });
  });
});
