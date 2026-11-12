import { describe, expect, it } from "vitest";
import { adminUserListQuerySchema, updateAdminUserInputSchema } from "./admin-user";

describe("adminUserListQuerySchema", () => {
  it("aplica valores por defecto y limpia la búsqueda vacía", () => {
    expect(adminUserListQuerySchema.parse({ search: "  " })).toEqual({
      page: 1,
      pageSize: 10,
      status: "all",
      search: undefined,
    });
  });

  it.each([{ role: "ROOT" }, { status: "x" }, { page: "0" }, { pageSize: "99" }])(
    "rechaza %j",
    (query) => {
      expect(adminUserListQuerySchema.safeParse(query).success).toBe(false);
    },
  );
});

describe("updateAdminUserInputSchema", () => {
  it("acepta isActive, role o ambos", () => {
    expect(updateAdminUserInputSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateAdminUserInputSchema.safeParse({ role: "ADMIN" }).success).toBe(true);
    expect(updateAdminUserInputSchema.safeParse({ isActive: true, role: "USER" }).success).toBe(
      true,
    );
  });

  it.each([{}, { role: "ROOT" }, { isActive: "no" }])("rechaza %j", (body) => {
    expect(updateAdminUserInputSchema.safeParse(body).success).toBe(false);
  });
});
