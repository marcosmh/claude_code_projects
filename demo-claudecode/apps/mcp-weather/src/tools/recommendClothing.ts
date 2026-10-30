import { z } from "zod";
import { recommendClothing as advise } from "../domain/clothing.js";
import { formatTemperature } from "../domain/units.js";
import { describeWeatherCode } from "../domain/weatherCodes.js";
import type { WeatherService } from "../services/WeatherService.js";
import { errorResult, textResult, type ToolResult } from "./result.js";
import { activitySchema, citySchema, countrySchema, unitsSchema } from "./schemas.js";

export const recommendClothingInput = { city: citySchema, country: countrySchema, units: unitsSchema, activity: activitySchema };

const bullets = (title: string, items: string[]) => (items.length ? [`${title}:`, ...items.map((i) => `  - ${i}`)] : []);

export async function recommendClothing(
  service: WeatherService,
  input: z.infer<z.ZodObject<typeof recommendClothingInput>>,
): Promise<ToolResult> {
  try {
    const report = await service.getReport(input.city, input.country);
    const advice = advise(report, input.activity, input.units);
    const place = [report.location.name, report.location.country].filter(Boolean).join(", ");
    const text = [
      `Qué ponerte en ${place} (${input.activity}): ${describeWeatherCode(report.weatherCode)}, ${formatTemperature(report.temperatureC, input.units)}, sensación ${formatTemperature(report.feelsLikeC, input.units)}.`,
      "",
      ...bullets("Ropa", advice.clothing),
      ...bullets("Abrigo", advice.outerwear),
      ...bullets("Calzado", advice.footwear),
      ...bullets("Accesorios", advice.accessories),
      "",
      ...bullets("Por qué", advice.reasons),
    ].join("\n");
    return textResult(text.trimEnd(), {
      city: report.location.name,
      country: report.location.country,
      activity: input.activity,
      comfort: advice.comfort,
      condition: describeWeatherCode(report.weatherCode),
      clothing: advice.clothing,
      outerwear: advice.outerwear,
      footwear: advice.footwear,
      accessories: advice.accessories,
      reasons: advice.reasons,
    });
  } catch (error) {
    return errorResult(error);
  }
}
