import { describe, expect, it } from "vitest";
import { mapServerErrors } from "./invoiceForm";

describe("mapServerErrors", () => {
  it("mapea campos y renombra unitPriceCents a price", () => {
    const result = mapServerErrors(
      [
        { field: "clientName", message: "a" },
        { field: "items.2.unitPriceCents", message: "b" },
        { field: "items", message: "c" },
        { message: "d" },
      ],
      "x",
    );
    expect(result.fields).toEqual([
      { name: "clientName", message: "a" },
      { name: "items.2.price", message: "b" },
    ]);
    expect(result.general).toEqual(["c", "d"]);
  });

  it("usa el mensaje de respaldo si no hay detalles", () => {
    expect(mapServerErrors([], "Falló")).toEqual({ fields: [], general: ["Falló"] });
  });
});
