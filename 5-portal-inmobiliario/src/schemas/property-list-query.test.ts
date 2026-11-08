import { describe, expect, it } from "vitest";
import { propertyListQuerySchema } from "./property-list-query";

describe("propertyListQuerySchema", () => {
  it("aplica valores por defecto", () => {
    expect(propertyListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 12 });
  });

  it("convierte strings de la URL a números", () => {
    expect(propertyListQuerySchema.parse({ page: "2", pageSize: "24" })).toEqual({
      page: 2,
      pageSize: 24,
    });
  });

  it.each([
    { page: "0" },
    { page: "-1" },
    { page: "abc" },
    { page: "1.5" },
    { pageSize: "0" },
    { pageSize: "51" },
  ])("rechaza %j", (input) => {
    expect(propertyListQuerySchema.safeParse(input).success).toBe(false);
  });
});
