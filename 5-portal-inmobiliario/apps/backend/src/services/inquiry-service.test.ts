import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { InquiryRepository, UserInquiryRecord } from "@/repositories/inquiry-repository";
import { createInquiryService } from "./inquiry-service";

const input = {
  propertyId: "p1",
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "+52 55 1234 5678",
  message: "Me interesa visitar la propiedad.",
};

function buildRecord(id: string, imageUrl: string | null = null): UserInquiryRecord {
  return {
    id,
    propertyId: `p-${id}`,
    userId: "u1",
    name: "Ana",
    email: "ana@example.com",
    phone: null,
    message: `Mensaje ${id}`,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    property: {
      id: `p-${id}`,
      title: `Propiedad ${id}`,
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
  } as UserInquiryRecord;
}

function buildRepository(overrides: Partial<InquiryRepository> = {}): InquiryRepository {
  return {
    findPublishedPropertyTitle: vi.fn().mockResolvedValue("Casa en Mérida"),
    create: vi.fn().mockResolvedValue({ id: "inq-1" }),
    findPageByUser: vi.fn().mockResolvedValue({ records: [], total: 0 }),
    deleteByIdAndUser: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("submitInquiry", () => {
  it("guarda la consulta y devuelve su id", async () => {
    const repository = buildRepository();
    const result = await createInquiryService(repository).submitInquiry(input);

    expect(result).toEqual({ id: "inq-1" });
    expect(repository.create).toHaveBeenCalledWith({
      propertyId: "p1",
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "+52 55 1234 5678",
      message: "Me interesa visitar la propiedad.",
    });
  });

  it("relaciona la consulta con el usuario autenticado cuando existe", async () => {
    const repository = buildRepository();
    await createInquiryService(repository).submitInquiry(input, "user-1");
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
  });

  it("no envía teléfono cuando el visitante no lo indicó", async () => {
    const repository = buildRepository();
    await createInquiryService(repository).submitInquiry({ ...input, phone: undefined });
    expect(repository.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ phone: expect.anything() }),
    );
  });

  it("lanza NotFoundError y no guarda nada si la propiedad no está publicada", async () => {
    const repository = buildRepository({
      findPublishedPropertyTitle: vi.fn().mockResolvedValue(null),
    });
    await expect(createInquiryService(repository).submitInquiry(input)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe("listUserInquiries", () => {
  it("devuelve la página con título, imagen, asunto, mensaje y totales", async () => {
    const repository = buildRepository({
      findPageByUser: vi.fn().mockResolvedValue({
        records: [buildRecord("2", "https://img.example/2.jpg"), buildRecord("1")],
        total: 8,
      }),
    });
    const result = await createInquiryService(repository).listUserInquiries("u1", {
      page: 2,
      pageSize: 6,
      q: "casa",
    });

    expect(repository.findPageByUser).toHaveBeenCalledWith({
      userId: "u1",
      skip: 6,
      take: 6,
      searchText: "casa",
    });
    expect(result).toMatchObject({ page: 2, pageSize: 6, total: 8, totalPages: 2 });
    expect(result.items).toEqual([
      {
        id: "2",
        propertyId: "p-2",
        propertyTitle: "Propiedad 2",
        propertyImageUrl: "https://img.example/2.jpg",
        subject: "Nueva consulta: Propiedad 2",
        message: "Mensaje 2",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      expect.objectContaining({ id: "1", propertyImageUrl: null }),
    ]);
  });

  it("no envía texto de búsqueda cuando viene vacío", async () => {
    const repository = buildRepository();
    await createInquiryService(repository).listUserInquiries("u1", { page: 1, pageSize: 6, q: "" });
    expect(repository.findPageByUser).toHaveBeenCalledWith({ userId: "u1", skip: 0, take: 6 });
  });
});

describe("deleteUserInquiry", () => {
  it("elimina la consulta propia", async () => {
    const repository = buildRepository();
    await createInquiryService(repository).deleteUserInquiry("u1", "i1");
    expect(repository.deleteByIdAndUser).toHaveBeenCalledWith("i1", "u1");
  });

  it("lanza NotFoundError si no existe o es de otra persona", async () => {
    const repository = buildRepository({ deleteByIdAndUser: vi.fn().mockResolvedValue(false) });
    await expect(
      createInquiryService(repository).deleteUserInquiry("u1", "i1"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
