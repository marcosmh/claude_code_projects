import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deletePropertyImage,
  reorderPropertyImages,
  setPrimaryPropertyImage,
  uploadPropertyImage,
} from "./admin-images-client";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
afterEach(() => fetchMock.mockReset());

describe("admin-images-client", () => {
  it("sube el archivo como multipart sin Content-Type manual", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "i1" }, { status: 201 }));
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    await expect(uploadPropertyImage("p 1", file)).resolves.toEqual({ id: "i1" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/properties/p%201/images");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    expect(init.headers).not.toHaveProperty("Content-Type");
  });

  it("elimina con DELETE y acepta 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deletePropertyImage("p1", "i1")).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/properties/p1/images/i1");
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("DELETE");
  });

  it("marca la principal y reordena con cuerpo JSON", async () => {
    fetchMock.mockImplementation(async () => Response.json([]));
    await setPrimaryPropertyImage("p1", "i2");
    await reorderPropertyImages("p1", ["i2", "i1"]);

    const [, patch] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(patch.method).toBe("PATCH");
    expect(patch.body).toBe('{"isPrimary":true}');
    const [url, put] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/admin/properties/p1/images");
    expect(put.method).toBe("PUT");
    expect(put.body).toBe('{"imageIds":["i2","i1"]}');
  });

  it("lanza ApiRequestError con el mensaje del servidor", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ message: "Imagen no encontrada" }, { status: 404 }),
    );
    await expect(deletePropertyImage("p1", "x")).rejects.toMatchObject({
      message: "Imagen no encontrada",
      status: 404,
    });
  });
});
