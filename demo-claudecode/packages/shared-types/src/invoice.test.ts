import { describe, expect, it } from "vitest";
import { isInvoiceStatus, STATUS_LABELS, STATUSES } from "./invoice";

describe("invoice status", () => {
  it("recognises only the known statuses", () => {
    for (const s of STATUSES) expect(isInvoiceStatus(s)).toBe(true);
    expect(isInvoiceStatus("OVERDUE")).toBe(false);
    expect(isInvoiceStatus("")).toBe(false);
  });

  it("has a label for every status", () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([...STATUSES].sort());
  });
});
