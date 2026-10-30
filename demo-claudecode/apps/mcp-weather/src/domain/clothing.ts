import type { Activity, Units, WeatherReport } from "./types.js";
import { formatTemperature } from "./units.js";
import { precipitationKind } from "./weatherCodes.js";

export type ComfortBand = "frío extremo" | "muy frío" | "frío" | "fresco" | "templado" | "caluroso" | "muy caluroso";

export interface ClothingRecommendation {
  comfort: ComfortBand;
  /** °C the advice is based on: the feels-like temperature, raised for activities that warm you up. */
  effectiveC: number;
  clothing: string[];
  outerwear: string[];
  footwear: string[];
  accessories: string[];
  reasons: string[];
}

interface Outfit {
  clothing: string[];
  outerwear: string[];
  footwear: string[];
  accessories: string[];
}

/** Upper bounds (exclusive) in °C of each band, coldest first; anything above the last is "muy caluroso". */
const BANDS: readonly [number, ComfortBand][] = [
  [0, "frío extremo"],
  [10, "muy frío"],
  [16, "frío"],
  [21, "fresco"],
  [27, "templado"],
  [33, "caluroso"],
];

export function comfortBand(effectiveC: number): ComfortBand {
  return BANDS.find(([limit]) => effectiveC < limit)?.[1] ?? "muy caluroso";
}

const OUTFITS: Record<ComfortBand, Outfit> = {
  "frío extremo": {
    clothing: ["Ropa interior térmica", "Suéter grueso de lana o polar", "Pantalón largo grueso"],
    outerwear: ["Abrigo o parka de invierno"],
    footwear: ["Botas aisladas con suela antiderrapante", "Calcetines de lana"],
    accessories: ["Gorro", "Guantes", "Bufanda"],
  },
  "muy frío": {
    clothing: ["Camiseta de manga larga", "Suéter o sudadera gruesa", "Pantalón largo"],
    outerwear: ["Abrigo"],
    footwear: ["Zapatos cerrados o botas", "Calcetines gruesos"],
    accessories: ["Bufanda", "Guantes ligeros"],
  },
  frío: {
    clothing: ["Camiseta de manga larga o camisa", "Suéter ligero", "Pantalón largo"],
    outerwear: ["Chamarra ligera"],
    footwear: ["Zapatos cerrados"],
    accessories: [],
  },
  fresco: {
    clothing: ["Camisa o playera de manga larga", "Pantalón largo"],
    outerwear: ["Sudadera o cárdigan por si refresca"],
    footwear: ["Tenis o zapatos cerrados"],
    accessories: [],
  },
  templado: {
    clothing: ["Playera o camisa de manga corta", "Pantalón ligero o jeans"],
    outerwear: [],
    footwear: ["Tenis o zapatos cómodos"],
    accessories: [],
  },
  caluroso: {
    clothing: ["Ropa ligera de algodón o lino, de manga corta", "Shorts, falda o pantalón muy ligero"],
    outerwear: [],
    footwear: ["Sandalias o tenis transpirables"],
    accessories: ["Botella de agua"],
  },
  "muy caluroso": {
    clothing: ["Ropa muy ligera, holgada y de colores claros", "Shorts o falda"],
    outerwear: [],
    footwear: ["Sandalias o calzado muy transpirable"],
    accessories: ["Botella de agua", "Gorra o sombrero"],
  },
};

const COLD_BANDS: readonly ComfortBand[] = ["frío extremo", "muy frío", "frío"];

const WINDY_KMH = 30;
const VERY_WINDY_KMH = 40;
const GUSTY_KMH = 50;
/** Exercise makes you feel about this much warmer than the air does. */
const SPORT_WARMTH_C = 5;
const BIG_DAILY_RANGE_C = 10;

const unique = (items: string[]) => [...new Set(items)];

function applyActivity(outfit: Outfit, band: ComfortBand, activity: Activity): Outfit {
  switch (activity) {
    case "deporte":
      return {
        ...outfit,
        clothing: ["Ropa deportiva transpirable (evita el algodón)", ...outfit.clothing],
        footwear: ["Tenis deportivos con buen agarre"],
      };
    case "trabajo":
      return {
        ...outfit,
        clothing: [
          "Camisa o blusa (de manga corta si hace calor)",
          "Pantalón de vestir o falda",
          ...(band === "fresco" ? ["Saco o suéter fino"] : []),
          ...(COLD_BANDS.includes(band) ? ["Suéter o saco"] : []),
        ],
        footwear: ["Zapatos formales"],
      };
    case "exterior":
      return {
        ...outfit,
        footwear: ["Calzado de senderismo o tenis con buen agarre"],
        accessories: [...outfit.accessories, "Mochila con agua y una capa extra"],
      };
    default:
      return outfit;
  }
}

/**
 * Pure, deterministic clothing advice from a (metric) weather report. The base outfit comes from the feels-like
 * temperature band; rain, snow, storms, wind, sun and a wide daily range then add to it. Text is Spanish; the
 * temperatures quoted in `reasons` follow `units`.
 */
export function recommendClothing(report: WeatherReport, activity: Activity = "casual", units: Units = "metric"): ClothingRecommendation {
  const effectiveC = report.feelsLikeC + (activity === "deporte" ? SPORT_WARMTH_C : 0);
  const comfort = comfortBand(effectiveC);
  const outfit = applyActivity(OUTFITS[comfort], comfort, activity);

  const clothing = [...outfit.clothing];
  const outerwear = [...outfit.outerwear];
  const footwear = [...outfit.footwear];
  const accessories = [...outfit.accessories];
  const reasons = [
    `Sensación térmica de ${formatTemperature(report.feelsLikeC, units)}${
      activity === "deporte" ? ` (con ejercicio se siente como ${formatTemperature(effectiveC, units)})` : ""
    }: ${comfort}.`,
  ];

  const kind = precipitationKind(report.weatherCode);
  const windy = report.windKmh >= WINDY_KMH || report.windGustsKmh >= GUSTY_KMH;
  const veryWindy = report.windKmh >= VERY_WINDY_KMH || report.windGustsKmh >= GUSTY_KMH;
  const raining = kind === "rain" || (kind === "none" && report.precipitationMm > 0.1);
  const rainLikely = raining || report.precipitationProbability >= 50;

  if (kind === "storm") {
    reasons.push("Hay tormenta eléctrica: lo más seguro es no salir; si sales, evita descampados y árboles.");
    outerwear.push("Chamarra impermeable con capucha (mejor que el paraguas con rayos)");
    footwear.push("Calzado impermeable");
  } else if (kind === "snow") {
    reasons.push("Está nevando o hay riesgo de nieve.");
    outerwear.push("Abrigo impermeable");
    footwear.push("Botas impermeables con suela antiderrapante");
    accessories.push("Guantes", "Gorro");
  } else if (rainLikely) {
    reasons.push(
      raining
        ? "Está lloviendo ahora."
        : `Probabilidad de lluvia de ${Math.round(report.precipitationProbability)} % hoy.`,
    );
    outerwear.push("Impermeable ligero");
    footwear.push("Calzado impermeable o que se pueda mojar");
    if (veryWindy) reasons.push("Con tanto viento el paraguas no sirve: usa un impermeable con capucha.");
    else accessories.push("Paraguas");
  } else if (report.precipitationProbability >= 30) {
    reasons.push(`Posible lluvia (${Math.round(report.precipitationProbability)} %).`);
    accessories.push("Paraguas plegable por si acaso");
  }

  if (windy) {
    reasons.push(
      `Viento de ${Math.round(report.windKmh)} km/h con ráfagas de hasta ${Math.round(report.windGustsKmh)} km/h.`,
    );
    outerwear.push("Cortavientos");
  }

  if (report.uvIndexMax >= 3) {
    const spf = report.uvIndexMax >= 8 ? "SPF 50+" : "SPF 30+";
    reasons.push(`Índice UV máximo del día: ${report.uvIndexMax}.`);
    accessories.push(`Protector solar (${spf})`);
    if (report.uvIndexMax >= 6) accessories.push("Lentes de sol", "Gorra o sombrero");
  }

  const range = report.todayMaxC - report.todayMinC;
  if (range >= BIG_DAILY_RANGE_C) {
    reasons.push(
      `La temperatura de hoy va de ${formatTemperature(report.todayMinC, units)} a ${formatTemperature(report.todayMaxC, units)}: conviene vestir por capas.`,
    );
    outerwear.push("Una capa extra fácil de quitar y guardar");
  }

  if (report.humidityPercent >= 80 && effectiveC >= 27) {
    reasons.push(`Humedad alta (${Math.round(report.humidityPercent)} %): prefiere telas ligeras y transpirables.`);
  }

  return {
    comfort,
    effectiveC: Math.round(effectiveC * 10) / 10,
    clothing: unique(clothing),
    outerwear: unique(outerwear),
    footwear: unique(footwear),
    accessories: unique(accessories),
    reasons,
  };
}
