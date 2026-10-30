import { z } from "zod";
import type { WeatherReport, Units } from "../domain/types.js";
import { formatLocalTime, precipitation, speed, temperature, unitLabels } from "../domain/units.js";
import { describeWeatherCode } from "../domain/weatherCodes.js";
import type { WeatherService } from "../services/WeatherService.js";
import { errorResult, textResult, type ToolResult } from "./result.js";
import { citySchema, countrySchema, unitsSchema } from "./schemas.js";

export const getWeatherInput = { city: citySchema, country: countrySchema, units: unitsSchema };

/** The report as plain numbers in the requested units (what `structuredContent` carries). */
export function weatherSummary(report: WeatherReport, units: Units) {
  const labels = unitLabels(units);
  return {
    location: {
      city: report.location.name,
      region: report.location.region,
      country: report.location.country,
      countryCode: report.location.countryCode,
      latitude: report.location.latitude,
      longitude: report.location.longitude,
      timezone: report.location.timezone,
    },
    localTime: report.localTime,
    utcOffsetSeconds: report.utcOffsetSeconds,
    isDay: report.isDay,
    condition: describeWeatherCode(report.weatherCode),
    units: labels,
    temperature: temperature(report.temperatureC, units),
    feelsLike: temperature(report.feelsLikeC, units),
    todayMin: temperature(report.todayMinC, units),
    todayMax: temperature(report.todayMaxC, units),
    humidityPercent: report.humidityPercent,
    precipitation: precipitation(report.precipitationMm, units),
    precipitationProbabilityPercent: report.precipitationProbability,
    wind: speed(report.windKmh, units),
    windGusts: speed(report.windGustsKmh, units),
    uvIndexMax: report.uvIndexMax,
  };
}

export async function getWeather(service: WeatherService, input: z.infer<z.ZodObject<typeof getWeatherInput>>): Promise<ToolResult> {
  try {
    const report = await service.getReport(input.city, input.country);
    const s = weatherSummary(report, input.units);
    const l = s.units;
    const place = [s.location.city, s.location.region, s.location.country].filter(Boolean).join(", ");
    const text = [
      `${place}`,
      `Hora local: ${formatLocalTime(report.localTime, report.utcOffsetSeconds)} (${s.location.timezone}), ${report.isDay ? "de día" : "de noche"}`,
      `Clima: ${s.condition}`,
      `Temperatura: ${s.temperature} ${l.temperature} (sensación ${s.feelsLike} ${l.temperature})`,
      `Hoy: mínima ${s.todayMin} ${l.temperature}, máxima ${s.todayMax} ${l.temperature}`,
      `Humedad: ${s.humidityPercent} %`,
      `Viento: ${s.wind} ${l.speed} (ráfagas ${s.windGusts} ${l.speed})`,
      `Precipitación: ${s.precipitation} ${l.precipitation} ahora, ${s.precipitationProbabilityPercent} % de probabilidad hoy`,
      `Índice UV máximo: ${s.uvIndexMax}`,
    ].join("\n");
    return textResult(text, s);
  } catch (error) {
    return errorResult(error);
  }
}
