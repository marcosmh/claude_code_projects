import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));
const fetchPropertyDetail = vi.hoisted(() => vi.fn());
vi.mock("@portal/api-client", () => ({
  buildPropertyUrl: (id: string) => `/api/properties/${encodeURIComponent(id)}`,
  fetchPropertyDetail,
}));

import { loadPropertyForMetadata } from "./server-property";

afterEach(() => {
  fetchPropertyDetail.mockReset();
  vi.unstubAllEnvs();
});

describe("loadPropertyForMetadata", () => {
  it("consulta al backend con URL absoluta", async () => {
    vi.stubEnv("BACKEND_URL", "http://backend:4000");
    fetchPropertyDetail.mockResolvedValue({ id: "p1" });
    await expect(loadPropertyForMetadata("p1")).resolves.toEqual({ id: "p1" });
    expect(fetchPropertyDetail).toHaveBeenCalledWith("http://backend:4000/api/properties/p1");
  });

  it("devuelve null ante cualquier fallo", async () => {
    fetchPropertyDetail.mockRejectedValue(new Error("404"));
    await expect(loadPropertyForMetadata("x")).resolves.toBeNull();
  });
});
