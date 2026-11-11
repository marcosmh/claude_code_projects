import { describe, expect, it, vi } from "vitest";
import type { AdminRepository } from "@/repositories/admin-repository";
import { createAdminService } from "./admin-service";

describe("getDashboard", () => {
  it("devuelve los indicadores del repositorio", async () => {
    const indicators = {
      totalProperties: 10,
      publishedProperties: 8,
      propertiesForSale: 5,
      propertiesForRent: 3,
      users: 4,
      inquiries: 7,
    };
    const repository: AdminRepository = { countIndicators: vi.fn().mockResolvedValue(indicators) };

    expect(await createAdminService(repository).getDashboard()).toEqual(indicators);
  });
});
