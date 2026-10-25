import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  it("fija el título con el sufijo de la app y lo actualiza al cambiar", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), { initialProps: { title: "Facturas" } });
    expect(document.title).toBe("Facturas · Facturas");

    rerender({ title: "Dashboard" });
    expect(document.title).toBe("Dashboard · Facturas");
  });
});
