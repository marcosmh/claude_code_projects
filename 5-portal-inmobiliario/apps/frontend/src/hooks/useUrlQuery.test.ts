// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", async () => (await import("@/test/fake-navigation")).fakeNavigation);

import { getFakeSearch, setFakeSearch } from "@/test/fake-navigation";
import { parsePageParam, useClampPage, useUrlQuery } from "./useUrlQuery";

afterEach(() => {
  cleanup();
  setFakeSearch("");
});

const defaults = { page: "1", search: "", role: "" };

describe("parsePageParam", () => {
  it("acepta enteros positivos y trata lo demás como la página 1", () => {
    expect(parsePageParam("3")).toBe(3);
    expect(parsePageParam("0")).toBe(1);
    expect(parsePageParam("-2")).toBe(1);
    expect(parsePageParam("abc")).toBe(1);
    expect(parsePageParam("")).toBe(1);
  });
});

describe("useUrlQuery", () => {
  it("usa los valores por defecto cuando la URL no trae parámetros", () => {
    const { result } = renderHook(() => useUrlQuery(defaults));
    expect(result.current.values).toEqual(defaults);
  });

  it("lee los parámetros de la URL", () => {
    setFakeSearch("page=2&search=casa");
    const { result } = renderHook(() => useUrlQuery(defaults));
    expect(result.current.values).toEqual({ page: "2", search: "casa", role: "" });
  });

  it("escribe varios parámetros a la vez y omite los que valen lo mismo que el valor por defecto", () => {
    const { result } = renderHook(() => useUrlQuery(defaults));
    act(() => result.current.update({ page: "1", search: "casa", role: "ADMIN" }));
    expect(getFakeSearch()).toBe("search=casa&role=ADMIN");
    expect(result.current.values.search).toBe("casa");

    act(() => result.current.update({ search: "" }));
    expect(getFakeSearch()).toBe("role=ADMIN");
  });

  it("dos cambios seguidos antes de que la URL se actualice no se pisan", () => {
    const { result } = renderHook(() => useUrlQuery(defaults));
    act(() => {
      result.current.update({ search: "casa" });
      result.current.update({ role: "ADMIN" });
    });
    expect(Object.fromEntries(new URLSearchParams(getFakeSearch()))).toEqual({
      search: "casa",
      role: "ADMIN",
    });
  });

  it("conserva los parámetros ajenos a la lista", () => {
    setFakeSearch("otro=1");
    const { result } = renderHook(() => useUrlQuery(defaults));
    act(() => result.current.update({ page: "2" }));
    expect(new URLSearchParams(getFakeSearch()).get("otro")).toBe("1");
  });
});

describe("useClampPage", () => {
  it("lleva a la última página solo si la actual la supera", () => {
    const goToPage = vi.fn();
    const { rerender } = renderHook(({ page }) => useClampPage(page, 3, goToPage), {
      initialProps: { page: 2 },
    });
    expect(goToPage).not.toHaveBeenCalled();
    rerender({ page: 5 });
    expect(goToPage).toHaveBeenCalledWith(3);
  });

  it("no hace nada mientras se desconoce el total", () => {
    const goToPage = vi.fn();
    renderHook(() => useClampPage(4, undefined, goToPage));
    expect(goToPage).not.toHaveBeenCalled();
  });
});
