import { describe, expect, it } from "vitest";
import { sortGalleryImages, wrapIndex } from "./gallery";

const image = (id: string, position: number, isPrimary = false) => ({
  id,
  url: `https://example.com/${id}.jpg`,
  position,
  isPrimary,
});

describe("sortGalleryImages", () => {
  it("coloca la principal primero y ordena el resto por posición", () => {
    const sorted = sortGalleryImages([
      image("c", 2),
      image("b", 1),
      image("a", 0),
      image("p", 5, true),
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["p", "a", "b", "c"]);
  });

  it("no modifica el arreglo original", () => {
    const original = [image("b", 1), image("a", 0)];
    sortGalleryImages(original);
    expect(original.map((item) => item.id)).toEqual(["b", "a"]);
  });
});

describe("wrapIndex", () => {
  it("navega de forma circular", () => {
    expect(wrapIndex(4, 4)).toBe(0);
    expect(wrapIndex(-1, 4)).toBe(3);
    expect(wrapIndex(2, 4)).toBe(2);
  });
  it("devuelve 0 sin imágenes", () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});
