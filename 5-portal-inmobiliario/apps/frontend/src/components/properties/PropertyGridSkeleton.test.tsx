// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PropertyGridSkeleton } from "./PropertyGridSkeleton";

afterEach(cleanup);

describe("PropertyGridSkeleton", () => {
  it("anuncia la carga y renderiza la cantidad pedida de marcadores", () => {
    const { container } = render(<PropertyGridSkeleton count={4} label="Cargando propiedades" />);
    const status = screen.getByRole("status", { name: "Cargando propiedades" });
    expect(status.children).toHaveLength(4);
    expect(container.querySelectorAll("[aria-hidden='true']").length).toBe(12);
  });
});
