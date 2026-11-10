import { describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { InquiryRepository } from "@/repositories/inquiry-repository";
import type { PropertySummaryRecord } from "@/repositories/property-repository";
import { createInquiryService } from "./inquiry-service";

const input = {
  propertyId: "p1",
  name: "Ana Pérez",
  email: "ana@example.com",
  phone: "+52 55 1234 5678",
  message: "Me interesa visitar la propiedad.",
};

function buildRecord(id: string): PropertySummaryRecord {
  return {
    id,
    title: `Propiedad ${id}`,
    operation: "SALE",
    type: "HOUSE",
    price: { toNumber: () => 1500000 },
    currency: "MXN",
    usableArea: null,
    bedrooms: null,
    bathrooms: null,
    commune: "Roma Norte",
    city: "Ciudad de México",
    region: "Ciudad de México",
    isFeatured: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    images: [],
  } as unknown as PropertySummaryRecord;
}

function buildRepository(overrides: Partial<InquiryRepository> = {}): InquiryRepository {
  return {
    findPublishedPropertyTitle: vi.fn().mockResolvedValue("Casa en Mérida"),
    create: vi.fn().mockResolvedValue({ id: "inq-1" }),
    listInquiredPropertiesByUser: vi.fn().mockResolvedValue([]),
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

describe("listInquiredProperties", () => {
  it("devuelve las propiedades consultadas como resúmenes", async () => {
    const repository = buildRepository({
      listInquiredPropertiesByUser: vi
        .fn()
        .mockResolvedValue([buildRecord("p2"), buildRecord("p1")]),
    });
    const properties = await createInquiryService(repository).listInquiredProperties("u1");

    expect(repository.listInquiredPropertiesByUser).toHaveBeenCalledWith("u1");
    expect(properties.map((property) => property.id)).toEqual(["p2", "p1"]);
    expect(properties[0]).toMatchObject({ price: 1500000, primaryImageUrl: null });
  });
});
