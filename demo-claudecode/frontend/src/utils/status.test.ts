import { describe, expect, it } from "vitest";
import { isStatus, STATUS_COLOR, STATUS_LABELS, STATUSES } from "./status";

describe("status", () => {
  it("expone los tres estados del contrato", () => {
    expect(STATUSES).toEqual(["DRAFT", "SENT", "PAID"]);
  });

  it("tiene etiqueta en español y color para cada estado", () => {
    expect(STATUS_LABELS).toEqual({ DRAFT: "Borrador", SENT: "Enviada", PAID: "Pagada" });
    for (const s of STATUSES) expect(STATUS_COLOR[s]).toMatch(/^var\(--series-\d\)$/);
  });

  it.each(["DRAFT", "SENT", "PAID"])("isStatus acepta %s", (value) => {
    expect(isStatus(value)).toBe(true);
  });

  it.each([null, undefined, "", "draft", "OVERDUE"])("isStatus rechaza %s", (value) => {
    expect(isStatus(value)).toBe(false);
  });
});
