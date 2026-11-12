import { describe, expect, it } from "vitest";
import { adminInquiryListQuerySchema } from "./admin-inquiry";

describe("adminInquiryListQuerySchema", () => {
  it("aplica valores por defecto y limpia textos vacíos", () => {
    expect(adminInquiryListQuerySchema.parse({ search: " ", propertyId: "" })).toEqual({
      page: 1,
      pageSize: 10,
      search: undefined,
      propertyId: undefined,
    });
  });

  it("acepta búsqueda y propiedad", () => {
    expect(
      adminInquiryListQuerySchema.parse({ search: " casa ", propertyId: "p1", page: "2" }),
    ).toMatchObject({
      search: "casa",
      propertyId: "p1",
      page: 2,
    });
  });

  it.each([{ page: "0" }, { pageSize: "99" }, { search: "x".repeat(101) }])(
    "rechaza %j",
    (query) => {
      expect(adminInquiryListQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});
