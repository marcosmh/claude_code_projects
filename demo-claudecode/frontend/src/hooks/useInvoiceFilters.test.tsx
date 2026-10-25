import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { PAGE_SIZE, useInvoiceFilters } from "./useInvoiceFilters";

function setup(url: string) {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>;
  return renderHook(
    () => {
      const filters = useInvoiceFilters();
      const location = useLocation();
      return { ...filters, search: location.search };
    },
    { wrapper },
  );
}

describe("useInvoiceFilters", () => {
  it("lee estado, búsqueda y página de la URL", () => {
    const { result } = setup("/invoices?status=SENT&q=%20acme%20&page=3");
    expect(result.current).toMatchObject({ status: "SENT", q: "acme", page: 3 });
    expect(result.current.apiParams).toEqual({ status: "SENT", search: "acme", page: 3, pageSize: PAGE_SIZE });
  });

  it("usa valores por defecto con una URL vacía", () => {
    const { result } = setup("/invoices");
    expect(result.current).toMatchObject({ status: undefined, q: "", page: 1 });
    expect(result.current.apiParams.search).toBeUndefined();
  });

  it.each(["abc", "0", "-2", "1.5"])("ignora un page inválido (%s)", (page) => {
    expect(setup(`/invoices?page=${page}`).result.current.page).toBe(1);
  });

  it("ignora un status desconocido", () => {
    expect(setup("/invoices?status=OVERDUE").result.current.status).toBeUndefined();
  });

  it("update escribe q y status y reinicia la página", () => {
    const { result } = setup("/invoices?page=4");
    act(() => result.current.update({ q: " acme ", status: "PAID" }));
    expect(new URLSearchParams(result.current.search).toString()).toBe("q=acme&status=PAID");
  });

  it("update con valores vacíos limpia los parámetros", () => {
    const { result } = setup("/invoices?status=SENT&q=acme");
    act(() => result.current.update({ q: "", status: "" }));
    expect(result.current.search).toBe("");
  });

  it("update conserva el resto de filtros cuando solo cambia uno", () => {
    const { result } = setup("/invoices?status=SENT&q=acme");
    act(() => result.current.update({ status: "PAID" }));
    expect(new URLSearchParams(result.current.search).get("q")).toBe("acme");
    expect(new URLSearchParams(result.current.search).get("status")).toBe("PAID");
  });

  it("update de página: la 1 no aparece en la URL y otras sí", () => {
    const { result } = setup("/invoices");
    act(() => result.current.update({ page: 2 }));
    expect(result.current.search).toBe("?page=2");
    act(() => result.current.update({ page: 1 }));
    expect(result.current.search).toBe("");
  });
});
