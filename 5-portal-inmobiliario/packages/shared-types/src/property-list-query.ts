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
    operation: z.enum(["SALE", "RENT"]).optional(),
    type: z.enum(propertyTypeValues).optional(),
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
