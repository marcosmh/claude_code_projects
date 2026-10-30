import { z } from "zod";

// Letters (any alphabet), digits, spaces and a few punctuation marks used in place names ("St. John's", "Guadalajara-Jalisco").
const CITY_PATTERN = /^[\p{L}\p{M}\d .,'’()-]+$/u;

export const citySchema = z
  .string("Indica la ciudad")
  .trim()
  .min(2, "La ciudad debe tener al menos 2 caracteres")
  .max(80, "La ciudad no puede pasar de 80 caracteres")
  .regex(CITY_PATTERN, "La ciudad solo puede llevar letras, números, espacios y . , ' ( ) -")
  .describe("Nombre de la ciudad, por ejemplo 'Oaxaca' o 'Madrid'");

export const countrySchema = z
  .string()
  .regex(/^[A-Za-z]{2}$/, "El país debe ser un código ISO de 2 letras, por ejemplo MX o ES")
  .optional()
  .describe("Código de país ISO 3166-1 de 2 letras para desambiguar (MX, ES, US...)");

export const unitsSchema = z
  .enum(["metric", "imperial"])
  .default("metric")
  .describe("metric = °C y km/h (por defecto); imperial = °F y mph");

export const activitySchema = z
  .enum(["casual", "trabajo", "deporte", "exterior"])
  .default("casual")
  .describe("Para qué es la ropa: casual (por defecto), trabajo, deporte o exterior (caminata, campo)");
