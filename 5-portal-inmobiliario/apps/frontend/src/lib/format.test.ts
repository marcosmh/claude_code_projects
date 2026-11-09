import { describe, expect, it } from "vitest";
import {
  formatArea,
  formatBathrooms,
  formatOperation,
  formatPrice,
  formatPropertyType,
} from "./format";

describe("formatPrice", () => {
  it("formatea ventas en pesos mexicanos sin decimales", () => {
    expect(formatPrice(4850000, "MXN", "SALE")).toBe("$4,850,000");
  });

  it("agrega '/ mes' en arriendos", () => {
    expect(formatPrice(24500, "MXN", "RENT")).toBe("$24,500\u00a0/\u00a0mes");
  });

  it("distingue la moneda USD", () => {
    expect(formatPrice(385000, "USD", "SALE")).toContain("385,000");
    expect(formatPrice(385000, "USD", "SALE")).toContain("USD");
  });
});

describe("formatArea", () => {
  it("agrega m² y respeta decimales", () => {
    expect(formatArea(210)).toBe("210\u00a0m²");
    expect(formatArea(210.5)).toBe("210.5\u00a0m²");
  });
});

describe("formatBathrooms", () => {
  it("usa singular y plural", () => {
    expect(formatBathrooms(1)).toBe("1\u00a0baño");
    expect(formatBathrooms(2)).toBe("2\u00a0baños");
  });
});

describe("etiquetas de propiedad", () => {
  it("traduce tipo y operación", () => {
    expect(formatPropertyType("HOUSE")).toBe("Casa");
    expect(formatPropertyType("COMMERCIAL")).toBe("Local comercial");
    expect(formatOperation("SALE")).toBe("Venta");
    expect(formatOperation("RENT")).toBe("Arriendo");
  });
});
