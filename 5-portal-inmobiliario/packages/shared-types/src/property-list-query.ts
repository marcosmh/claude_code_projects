import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 12;
export const MAXIMUM_PAGE_SIZE = 50;

const optionalText = z
  .string()
  .trim()
  .max(100)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/** Número opcional: la cadena vacía (campo sin llenar) equivale a "sin filtro". */
const optionalNumber = (schema: z.ZodType<number>) =>
  z.union([z.literal("").transform(() => undefined), schema.optional()]).optional();

/**
 * Lista separada por comas (p. ej. "SALE,RENT"). Un valor único sigue siendo válido;
 * los duplicados se eliminan y una lista vacía equivale a "sin filtro".
 */
const commaSeparatedEnum = <TValue extends string>(values: readonly [TValue, ...TValue[]]) =>
  z
    .string()
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== ""),
    )
    .pipe(z.array(z.enum(values)))
    .transform((items) => (items.length === 0 ? undefined : [...new Set(items)]))
    .optional();

export const propertyTypeValues = [
  "HOUSE",
  "APARTMENT",
  "LAND",
  "OFFICE",
  "COMMERCIAL",
  "OTHER",
] as const;

export const propertySortValues = [
  "newest",
  "price_asc",
  "price_desc",
  "area_asc",
  "area_desc",
] as const;
export type PropertySort = (typeof propertySortValues)[number];

export const propertyListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAXIMUM_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    search: z
      .string()
      .trim()
      .max(100)
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    /** Una o varias operaciones: `SALE`, `RENT` o `SALE,RENT`. */
    operation: commaSeparatedEnum(["SALE", "RENT"]),
    /** Uno o varios tipos separados por comas. */
    type: commaSeparatedEnum(propertyTypeValues),
    minPrice: optionalNumber(z.coerce.number().min(0)),
    maxPrice: optionalNumber(z.coerce.number().min(0)),
    /** Mínimo de dormitorios (3 = "3 o más"). */
    bedrooms: optionalNumber(z.coerce.number().int().min(0).max(20)),
    /** Mínimo de baños. */
    bathrooms: optionalNumber(z.coerce.number().int().min(0).max(20)),
    minUsableArea: optionalNumber(z.coerce.number().min(0)),
    commune: optionalText,
    city: optionalText,
    region: optionalText,
    sort: z.enum(propertySortValues).default("newest"),
    featured: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
  })
  .refine(
    (query) =>
      query.minPrice === undefined ||
      query.maxPrice === undefined ||
      query.minPrice <= query.maxPrice,
    { message: "El precio mínimo no puede superar al máximo", path: ["minPrice"] },
  );

export type PropertyListQuery = z.infer<typeof propertyListQuerySchema>;
