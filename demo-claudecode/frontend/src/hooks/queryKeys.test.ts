import { describe, expect, it } from "vitest";
import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("las claves de lista y detalle cuelgan de la raíz de facturas (invalidación en cascada)", () => {
    expect(queryKeys.invoiceList({ page: 2 }).slice(0, 1)).toEqual(queryKeys.invoices);
    expect(queryKeys.invoice(4).slice(0, 1)).toEqual(queryKeys.invoices);
  });

  it("incluyen los parámetros para no mezclar cachés", () => {
    expect(queryKeys.invoiceList({ page: 1 })).not.toEqual(queryKeys.invoiceList({ page: 2 }));
    expect(queryKeys.invoice(1)).toEqual(["invoices", "detail", 1]);
  });

  it("las claves de estadísticas cuelgan de stats", () => {
    expect(queryKeys.summary.slice(0, 1)).toEqual(queryKeys.stats);
    expect(queryKeys.monthly(6)).toEqual(["stats", "monthly", 6]);
    expect(queryKeys.monthly(3)).not.toEqual(queryKeys.monthly(6));
  });
});
