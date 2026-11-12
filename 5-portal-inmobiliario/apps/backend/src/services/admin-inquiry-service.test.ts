import { describe, expect, it, vi } from "vitest";
import type { AdminInquiryRepository } from "@/repositories/admin-inquiry-repository";
import { createAdminInquiryService } from "./admin-inquiry-service";

const record = (overrides = {}) => ({
  id: "i1",
  propertyId: "p1",
  userId: "u1",
  name: "Ana",
  email: "ana@example.com",
  phone: "+52 55 1234 5678",
  message: "Me interesa la casa",
  createdAt: new Date("2026-02-03T10:00:00Z"),
  property: { id: "p1", title: "Casa Roma", deletedAt: null as Date | null },
  user: { id: "u1", name: "Ana López" } as { id: string; name: string } | null,
  ...overrides,
});

function build(records = [record()]) {
  const repository: AdminInquiryRepository = {
    findPage: vi.fn().mockResolvedValue({ records, total: 21 }),
  };
  return { service: createAdminInquiryService(repository), repository };
}

describe("createAdminInquiryService", () => {
  it("lista paginado con propiedad, usuario y contacto", async () => {
    const { service, repository } = build();
    const result = await service.listInquiries({
      page: 3,
      pageSize: 10,
      search: "casa",
      propertyId: "p1",
    });
    expect(repository.findPage).toHaveBeenCalledWith({
      skip: 20,
      take: 10,
      searchText: "casa",
      propertyId: "p1",
    });
    expect(result).toMatchObject({ page: 3, total: 21, totalPages: 3 });
    expect(result.items[0]).toEqual({
      id: "i1",
      createdAt: "2026-02-03T10:00:00.000Z",
      message: "Me interesa la casa",
      name: "Ana",
      email: "ana@example.com",
      phone: "+52 55 1234 5678",
      propertyId: "p1",
      propertyTitle: "Casa Roma",
      propertyDeleted: false,
      userId: "u1",
      userName: "Ana López",
    });
  });

  it("marca visitantes sin cuenta y propiedades eliminadas", async () => {
    const { service } = build([
      record({
        user: null,
        userId: null,
        property: { id: "p1", title: "Casa Roma", deletedAt: new Date() },
      }),
    ]);
    const { items } = await service.listInquiries({ page: 1, pageSize: 10 });
    expect(items[0]).toMatchObject({ userId: null, userName: null, propertyDeleted: true });
  });
});
