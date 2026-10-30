import { describe, expect, it } from "vitest";
import { formatLocalTime, formatTemperature, precipitation, speed, temperature, unitLabels } from "../src/domain/units.js";
import { describeWeatherCode, precipitationKind } from "../src/domain/weatherCodes.js";

describe("units", () => {
  it("convierte °C -> °F, km/h -> mph y mm -> in", () => {
    expect(temperature(0, "imperial")).toBe(32);
    expect(temperature(100, "imperial")).toBe(212);
    expect(temperature(-40, "imperial")).toBe(-40);
    expect(temperature(21.46, "metric")).toBe(21.5);
    expect(speed(100, "imperial")).toBe(62.1);
    expect(speed(7.04, "metric")).toBe(7);
    expect(precipitation(25.4, "imperial")).toBe(1);
    expect(precipitation(1.25, "metric")).toBe(1.3);
  });

  it("etiquetas por sistema de unidades", () => {
    expect(unitLabels("metric")).toEqual({ temperature: "°C", speed: "km/h", precipitation: "mm" });
    expect(unitLabels("imperial")).toEqual({ temperature: "°F", speed: "mph", precipitation: "in" });
    expect(formatTemperature(20, "imperial")).toBe("68 °F");
  });

  it("formatLocalTime muestra el desfase UTC con signo y minutos", () => {
    expect(formatLocalTime("2026-10-29T21:00", -21600)).toBe("2026-10-29 21:00 (UTC-06:00)");
    expect(formatLocalTime("2026-10-30T02:30", 19800)).toBe("2026-10-30 02:30 (UTC+05:30)");
    expect(formatLocalTime("2026-10-30T00:00", 0)).toBe("2026-10-30 00:00 (UTC+00:00)");
  });
});

describe("weatherCodes", () => {
  it("describe en español y no inventa códigos desconocidos", () => {
    expect(describeWeatherCode(0)).toBe("Despejado");
    expect(describeWeatherCode(95)).toBe("Tormenta eléctrica");
    expect(describeWeatherCode(1234)).toBe("Condición desconocida");
  });

  it.each([
    [0, "none"],
    [3, "none"],
    [45, "none"],
    [53, "rain"],
    [82, "rain"],
    [75, "snow"],
    [86, "snow"],
    [95, "storm"],
    [99, "storm"],
  ] as const)("código %s -> %s", (code, kind) => {
    expect(precipitationKind(code)).toBe(kind);
  });
});
