import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatMoney, plural, toDateInput, todayInput } from "./format";

const originalTz = process.env.TZ;
beforeEach(() => {
  process.env.TZ = "America/Mexico_City"; // UTC-6 todo el año
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
});

describe("todayInput", () => {
  it("usa la fecha local: a las 21:30 locales sigue siendo hoy aunque en UTC ya sea mañana", () => {
    vi.setSystemTime(new Date("2026-10-26T03:30:00Z")); // 21:30 del 25 en Ciudad de México
    expect(todayInput()).toBe("2026-10-25");
  });

  it("suma días de calendario y cruza fin de mes y de año", () => {
    vi.setSystemTime(new Date("2026-12-20T18:00:00Z"));
    expect(todayInput(30)).toBe("2027-01-19");
    expect(todayInput(-20)).toBe("2026-11-30");
  });
});

describe("formatMoney", () => {
  it("formatea centavos como moneda", () => {
    expect(formatMoney(123456).replace(/\s/g, " ")).toBe("1234,56 US$");
  });

  it("formatea cero", () => {
    expect(formatMoney(0)).toContain("0,00");
  });
});

describe("formatDate", () => {
  it("acepta un ISO completo y no depende de la zona horaria local", () => {
    expect(formatDate("2026-10-01T00:00:00.000Z")).toBe("1 oct 2026");
  });

  it("acepta YYYY-MM-DD", () => {
    expect(formatDate("2026-12-31")).toBe("31 dic 2026");
  });
});

describe("toDateInput", () => {
  it("recorta el ISO a YYYY-MM-DD", () => {
    expect(toDateInput("2026-10-01T23:59:59.000Z")).toBe("2026-10-01");
  });
});

describe("plural", () => {
  it("usa singular solo con 1", () => {
    expect(plural(1, "vencida", "vencidas")).toBe("1 vencida");
    expect(plural(0, "vencida", "vencidas")).toBe("0 vencidas");
    expect(plural(3, "vencida", "vencidas")).toBe("3 vencidas");
  });
});
