import { beforeEach, describe, expect, it } from "vitest";
import { MAX_TOASTS, useToastStore } from "./toastStore";

beforeEach(() => useToastStore.setState({ toasts: [] }));

describe("toastStore", () => {
  it("agrega avisos con ids únicos y en orden", () => {
    useToastStore.getState().push("success", "Uno");
    useToastStore.getState().push("error", "Dos");

    const { toasts } = useToastStore.getState();
    expect(toasts.map((t) => [t.type, t.message])).toEqual([
      ["success", "Uno"],
      ["error", "Dos"],
    ]);
    expect(new Set(toasts.map((t) => t.id)).size).toBe(2);
  });

  it("dismiss quita solo el aviso indicado", () => {
    useToastStore.getState().push("success", "Uno");
    useToastStore.getState().push("success", "Dos");
    const [first] = useToastStore.getState().toasts;

    useToastStore.getState().dismiss(first!.id);

    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["Dos"]);
  });

  it("dismiss con un id inexistente no cambia nada", () => {
    useToastStore.getState().push("success", "Uno");
    useToastStore.getState().dismiss(-1);
    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it(`conserva como máximo ${MAX_TOASTS} avisos y descarta los más antiguos`, () => {
    for (const n of [1, 2, 3, 4, 5]) useToastStore.getState().push("success", `Aviso ${n}`);
    expect(useToastStore.getState().toasts.map((t) => t.message)).toEqual(["Aviso 3", "Aviso 4", "Aviso 5"]);
  });
});
