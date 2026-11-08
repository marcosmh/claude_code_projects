import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Verifica el contraste WCAG AA de los pares de colores realmente usados por la
 * interfaz, leyendo los valores directamente de globals.css.
 */
const stylesheet = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

type Tokens = Record<string, string>;

function extractTokens(selector: string): Tokens {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const blockMatch = new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`).exec(stylesheet);
  if (!blockMatch) throw new Error(`No se encontró el bloque ${selector}`);
  const tokens: Tokens = {};
  for (const [, name, value] of blockMatch[1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[name] = value;
  }
  return tokens;
}

const themes: Record<string, Tokens> = {
  "Claro": extractTokens(":root"),
  "Oscuro": extractTokens(':root[data-theme="dark"]'),
  "Smallville": extractTokens(':root[data-theme="smallville"]'),
};

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as Rgb;
}

function blend(foreground: string, background: string, opacity: number): Rgb {
  const foregroundRgb = toRgb(foreground);
  const backgroundRgb = toRgb(background);
  return foregroundRgb.map(
    (channel, index) => channel * opacity + backgroundRgb[index] * (1 - opacity),
  ) as Rgb;
}

function luminance([red, green, blue]: Rgb): number {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("respaldo sin JavaScript", () => {
  it("replica exactamente los tokens del tema Oscuro", () => {
    const fallbackTokens = extractTokens(":root:not([data-theme])");
    expect(fallbackTokens).toEqual(themes["Oscuro"]);
  });
});

const TEXT_MINIMUM = 4.5;
const INTERFACE_MINIMUM = 3;

describe.each(Object.entries(themes))("contraste del tema %s", (_themeName, tokens) => {
  it("define todos los tokens requeridos", () => {
    for (const name of [
      "background", "foreground", "surface", "primary", "primary-hover", "primary-foreground",
      "link", "ring", "danger", "badge", "badge-foreground", "hero-tint",
    ]) {
      expect(tokens[name], `falta --${name}`).toBeDefined();
    }
  });

  it.each([
    ["texto principal sobre el fondo", "foreground", "background"],
    ["texto principal sobre superficies", "foreground", "surface"],
    ["texto del botón primario", "primary-foreground", "primary"],
    ["texto del botón primario (hover)", "primary-foreground", "primary-hover"],
    ["enlaces sobre el fondo", "link", "background"],
    ["enlaces sobre superficies", "link", "surface"],
    ["mensajes de error sobre el fondo", "danger", "background"],
    ["mensajes de error sobre superficies", "danger", "surface"],
    ["etiqueta de operación", "badge-foreground", "badge"],
    ["botón claro de la llamada a la acción", "primary", "primary-foreground"],
  ])("%s cumple 4.5:1", (_description, foregroundToken, backgroundToken) => {
    const ratio = contrastRatio(toRgb(tokens[foregroundToken]), toRgb(tokens[backgroundToken]));
    expect(ratio).toBeGreaterThanOrEqual(TEXT_MINIMUM);
  });

  it.each([
    ["texto secundario (foreground/70) sobre el fondo", 0.7, "background"],
    ["texto secundario (foreground/70) sobre superficies", 0.7, "surface"],
    ["texto terciario (foreground/60) sobre el fondo", 0.6, "background"],
  ])("%s cumple 4.5:1", (_description, opacity, backgroundToken) => {
    const background = tokens[backgroundToken];
    const ratio = contrastRatio(blend(tokens.foreground, background, opacity), toRgb(background));
    expect(ratio).toBeGreaterThanOrEqual(TEXT_MINIMUM);
  });

  it.each(["background", "surface"])("el indicador de foco (ring) sobre %s cumple 3:1", (backgroundToken) => {
    const ratio = contrastRatio(toRgb(tokens.ring), toRgb(tokens[backgroundToken]));
    expect(ratio).toBeGreaterThanOrEqual(INTERFACE_MINIMUM);
  });
});
