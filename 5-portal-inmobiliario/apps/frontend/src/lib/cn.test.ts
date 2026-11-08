import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("combina clases y resuelve conflictos de Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("ignora valores falsos", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
