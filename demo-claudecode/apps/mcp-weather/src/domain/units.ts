import type { Units } from "./types.js";

const round1 = (n: number) => Math.round(n * 10) / 10;

export const celsiusToFahrenheit = (c: number) => round1((c * 9) / 5 + 32);
export const kmhToMph = (kmh: number) => round1(kmh / 1.609344);
export const mmToInches = (mm: number) => Math.round((mm / 25.4) * 100) / 100;

export interface UnitLabels {
  temperature: "°C" | "°F";
  speed: "km/h" | "mph";
  precipitation: "mm" | "in";
}

export const unitLabels = (units: Units): UnitLabels =>
  units === "imperial" ? { temperature: "°F", speed: "mph", precipitation: "in" } : { temperature: "°C", speed: "km/h", precipitation: "mm" };

export const temperature = (celsius: number, units: Units) => (units === "imperial" ? celsiusToFahrenheit(celsius) : round1(celsius));
export const speed = (kmh: number, units: Units) => (units === "imperial" ? kmhToMph(kmh) : round1(kmh));
export const precipitation = (mm: number, units: Units) => (units === "imperial" ? mmToInches(mm) : round1(mm));

/** "21.5 °C" / "70.7 °F" */
export const formatTemperature = (celsius: number, units: Units) => `${temperature(celsius, units)} ${unitLabels(units).temperature}`;

/** `2026-10-29T21:00` + -21600 -> "2026-10-29 21:00 (UTC-06:00)" */
export function formatLocalTime(localTime: string, utcOffsetSeconds: number): string {
  const sign = utcOffsetSeconds < 0 ? "-" : "+";
  const abs = Math.abs(utcOffsetSeconds);
  const hh = String(Math.floor(abs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
  return `${localTime.replace("T", " ")} (UTC${sign}${hh}:${mm})`;
}
