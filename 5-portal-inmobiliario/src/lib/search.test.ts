import { describe, expect, it } from "vitest";
import { escapeLikePattern, MAXIMUM_SEARCH_TERMS, splitSearchTerms } from "./search";

describe("splitSearchTerms", () => {
  it("divide por espacios y recorta", () => {
    expect(splitSearchTerms("  San   Pedro  ")).toEqual(["San", "Pedro"]);
  });

  it("devuelve lista vacía con texto vacío o solo espacios", () => {
    expect(splitSearchTerms("")).toEqual([]);
    expect(splitSearchTerms("   ")).toEqual([]);
  });

  it("elimina términos repetidos sin distinguir mayúsculas", () => {
    expect(splitSearchTerms("Mérida mérida MÉRIDA")).toEqual(["Mérida"]);
  });

  it("limita la cantidad de términos", () => {
    const manyTerms = Array.from({ length: 12 }, (_, index) => `t${index}`).join(" ");
    expect(splitSearchTerms(manyTerms)).toHaveLength(MAXIMUM_SEARCH_TERMS);
  });

  it("conserva los acentos para que los trate la base de datos", () => {
    expect(splitSearchTerms("Querétaro")).toEqual(["Querétaro"]);
  });
});

describe("escapeLikePattern", () => {
  it("escapa %, _ y \\", () => {
    expect(escapeLikePattern("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });

  it("no modifica texto normal", () => {
    expect(escapeLikePattern("Querétaro")).toBe("Querétaro");
  });
});
