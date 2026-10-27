import { describe, expect, it } from "vitest";
import { retryDelay, shouldRetry } from "@/utils/apiErrors";
import { createQueryClient } from "./queryClient";

describe("createQueryClient", () => {
  it("crea clientes independientes con los valores por defecto de consulta", () => {
    const a = createQueryClient();
    const b = createQueryClient();
    const options = a.getDefaultOptions().queries;

    expect(a).not.toBe(b);
    expect(options).toMatchObject({ staleTime: 15_000, refetchOnWindowFocus: false, retry: shouldRetry, retryDelay });
  });
});
