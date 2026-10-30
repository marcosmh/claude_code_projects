import { describe, expect, it } from "vitest";
import { comfortBand, recommendClothing } from "../src/domain/clothing.js";
import { report } from "./helpers.js";

const joined = (r: ReturnType<typeof recommendClothing>) => [...r.clothing, ...r.outerwear, ...r.footwear, ...r.accessories].join(" | ");

describe("comfortBand", () => {
  it.each([
    [-5, "frío extremo"],
    [0, "muy frío"],
    [9.9, "muy frío"],
    [10, "frío"],
    [15.9, "frío"],
    [16, "fresco"],
    [20.9, "fresco"],
    [21, "templado"],
    [26.9, "templado"],
    [27, "caluroso"],
    [32.9, "caluroso"],
    [33, "muy caluroso"],
    [41, "muy caluroso"],
  ])("%s °C -> %s", (celsius, band) => {
    expect(comfortBand(celsius)).toBe(band);
  });
});

describe("recommendClothing: base outfit by feels-like temperature", () => {
  it("usa la sensación térmica, no la temperatura del aire", () => {
    const r = recommendClothing(report({ temperatureC: 12, feelsLikeC: 4 }));
    expect(r.comfort).toBe("muy frío");
    expect(r.outerwear).toContain("Abrigo");
    expect(r.accessories).toEqual(expect.arrayContaining(["Bufanda", "Guantes ligeros"]));
  });

  it("frío extremo: térmico, parka, gorro y guantes", () => {
    const r = recommendClothing(report({ feelsLikeC: -8, todayMinC: -10, todayMaxC: -3 }));
    expect(r.comfort).toBe("frío extremo");
    expect(joined(r)).toMatch(/térmica/);
    expect(r.outerwear).toContain("Abrigo o parka de invierno");
    expect(r.accessories).toEqual(expect.arrayContaining(["Gorro", "Guantes", "Bufanda"]));
  });

  it("templado: manga corta y nada de abrigo", () => {
    const r = recommendClothing(report({ feelsLikeC: 23 }));
    expect(r.comfort).toBe("templado");
    expect(r.outerwear).toEqual([]);
    expect(r.clothing[0]).toMatch(/manga corta/);
  });

  it("muy caluroso: ropa clara, agua y gorra", () => {
    const r = recommendClothing(report({ feelsLikeC: 38, todayMinC: 28, todayMaxC: 40 }));
    expect(r.comfort).toBe("muy caluroso");
    expect(r.accessories).toEqual(expect.arrayContaining(["Botella de agua", "Gorra o sombrero"]));
  });
});

describe("recommendClothing: weather modifiers", () => {
  it("lluvia ahora: impermeable, calzado impermeable y paraguas", () => {
    const r = recommendClothing(report({ weatherCode: 63, precipitationMm: 2.4, precipitationProbability: 90 }));
    expect(r.outerwear).toContain("Impermeable ligero");
    expect(r.footwear).toContain("Calzado impermeable o que se pueda mojar");
    expect(r.accessories).toContain("Paraguas");
    expect(r.reasons.join(" ")).toMatch(/lloviendo/);
  });

  it("probabilidad alta de lluvia sin llover todavía: lo avisa con el porcentaje", () => {
    const r = recommendClothing(report({ precipitationProbability: 70 }));
    expect(r.accessories).toContain("Paraguas");
    expect(r.reasons.join(" ")).toMatch(/70 %/);
  });

  it("probabilidad media: paraguas plegable por si acaso, sin impermeable", () => {
    const r = recommendClothing(report({ precipitationProbability: 35 }));
    expect(r.accessories).toContain("Paraguas plegable por si acaso");
    expect(r.outerwear).not.toContain("Impermeable ligero");
  });

  it("lluvia con mucho viento: impermeable con capucha en lugar de paraguas", () => {
    const r = recommendClothing(report({ weatherCode: 61, windKmh: 45, windGustsKmh: 60 }));
    expect(r.accessories).not.toContain("Paraguas");
    expect(r.outerwear).toEqual(expect.arrayContaining(["Impermeable ligero", "Cortavientos"]));
    expect(r.reasons.join(" ")).toMatch(/paraguas no sirve/);
  });

  it("tormenta eléctrica: avisa del riesgo y no recomienda paraguas", () => {
    const r = recommendClothing(report({ weatherCode: 95, precipitationProbability: 95 }));
    expect(r.reasons.join(" ")).toMatch(/tormenta eléctrica/);
    expect(r.accessories).not.toContain("Paraguas");
    expect(r.outerwear.join(" ")).toMatch(/impermeable/i);
  });

  it("nieve: botas antiderrapantes, guantes y gorro", () => {
    const r = recommendClothing(report({ weatherCode: 73, feelsLikeC: -2, todayMinC: -4, todayMaxC: 1 }));
    expect(r.footwear).toContain("Botas impermeables con suela antiderrapante");
    expect(r.accessories).toEqual(expect.arrayContaining(["Guantes", "Gorro"]));
  });

  it("viento fuerte: cortavientos", () => {
    const r = recommendClothing(report({ windKmh: 35, windGustsKmh: 48 }));
    expect(r.outerwear).toContain("Cortavientos");
  });

  it.each([
    [2, false, false, false],
    [3, true, false, false],
    [6, true, true, false],
    [9, true, true, true],
  ])("UV %s: protector=%s lentes/gorra=%s SPF50=%s", (uv, sunscreen, shades, spf50) => {
    const r = recommendClothing(report({ uvIndexMax: uv }));
    const accessories = r.accessories.join(" | ");
    expect(/Protector solar/.test(accessories)).toBe(sunscreen);
    expect(/Lentes de sol/.test(accessories)).toBe(shades);
    expect(/SPF 50\+/.test(accessories)).toBe(spf50);
  });

  it("gran diferencia entre mínima y máxima: sugiere capas y cita las temperaturas en la unidad pedida", () => {
    const metric = recommendClothing(report({ todayMinC: 8, todayMaxC: 24 }));
    expect(metric.outerwear).toContain("Una capa extra fácil de quitar y guardar");
    expect(metric.reasons.join(" ")).toMatch(/8 °C a 24 °C/);
    const imperial = recommendClothing(report({ todayMinC: 8, todayMaxC: 24 }), "casual", "imperial");
    expect(imperial.reasons.join(" ")).toMatch(/46\.4 °F a 75\.2 °F/);
  });

  it("calor con humedad alta: telas transpirables", () => {
    const r = recommendClothing(report({ feelsLikeC: 31, humidityPercent: 85 }));
    expect(r.reasons.join(" ")).toMatch(/Humedad alta/);
  });

  it("no repite prendas", () => {
    const r = recommendClothing(report({ weatherCode: 65, windKmh: 50, windGustsKmh: 70, precipitationProbability: 90 }));
    for (const list of [r.clothing, r.outerwear, r.footwear, r.accessories]) expect(new Set(list).size).toBe(list.length);
  });
});

describe("recommendClothing: activity", () => {
  it("deporte: se siente 5 °C más cálido, ropa técnica y tenis deportivos", () => {
    const casual = recommendClothing(report({ feelsLikeC: 12 }));
    const sport = recommendClothing(report({ feelsLikeC: 12 }), "deporte");
    expect(casual.comfort).toBe("frío");
    expect(sport.comfort).toBe("fresco");
    expect(sport.effectiveC).toBe(17);
    expect(sport.clothing[0]).toMatch(/transpirable/);
    expect(sport.footwear).toEqual(["Tenis deportivos con buen agarre"]);
    expect(sport.reasons[0]).toMatch(/con ejercicio se siente como 17 °C/);
  });

  it("trabajo: ropa formal y zapatos de vestir; con frío añade suéter o saco", () => {
    const warm = recommendClothing(report({ feelsLikeC: 24 }), "trabajo");
    expect(warm.clothing).toEqual(["Camisa o blusa (de manga corta si hace calor)", "Pantalón de vestir o falda"]);
    expect(warm.footwear).toEqual(["Zapatos formales"]);
    expect(recommendClothing(report({ feelsLikeC: 18 }), "trabajo").clothing).toContain("Saco o suéter fino");
    expect(recommendClothing(report({ feelsLikeC: 6 }), "trabajo").clothing).toContain("Suéter o saco");
  });

  it("exterior: calzado de senderismo y mochila con agua y capa extra", () => {
    const r = recommendClothing(report({ feelsLikeC: 22 }), "exterior");
    expect(r.footwear).toEqual(["Calzado de senderismo o tenis con buen agarre"]);
    expect(r.accessories).toContain("Mochila con agua y una capa extra");
  });
});
