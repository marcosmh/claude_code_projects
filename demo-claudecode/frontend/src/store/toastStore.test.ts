import { beforeEach, describe, expect, it } from "vitest";
import { useToastStore } from "./toastStore";

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
});
