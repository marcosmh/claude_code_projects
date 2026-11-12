import { z } from "zod";
import {
  advancedFilterShape,
  priceRangeCheck,
  propertyAvailabilityValues,
  propertyTypeValues,
  publishedRangeCheck,
} from "./property-list-query";
import type { PropertyDetailDto, PropertySummaryDto } from "./property";

const requiredText = (label: string, maximum: number) => {
  // Concordancia de género: «La ciudad es obligatoria», «El título es obligatorio».
  const required = `${label} es ${label.startsWith("La ") ? "obligatoria" : "obligatorio"}`;
  return z
    .string({ error: required })
    .trim()
    .min(1, required)
    .max(maximum, `Máximo ${maximum} caracteres`);
};

/** Número opcional: ausente o null se guardan como null. */
const optionalNumber = (schema: z.ZodNumber) =>
  schema.nullish().transform((value) => value ?? null);

/**
 * Cuerpo de POST y PUT /api/admin/properties. No incluye latitud ni longitud (spec §6) ni
 * imágenes/características, que se administran en endpoints propios (Pasos 26–28).
 */
export const propertyInputSchema = z
  .object({
    title: requiredText("El título", 150).min(5, "El título debe tener al menos 5 caracteres"),
    description: requiredText("La descripción", 5000).min(
      10,
      "La descripción debe tener al menos 10 caracteres",
    ),
    operation: z.enum(["SALE", "RENT"], { error: "Operación no válida" }),
    type: z.enum(propertyTypeValues, { error: "Tipo de propiedad no válido" }),
    price: z
      .number({ error: "El precio es obligatorio" })
      .positive("El precio debe ser mayor que cero")
      .max(999_999_999_999, "Precio demasiado alto"),
    currency: z.enum(["MXN", "USD"], { error: "Moneda no válida" }).default("MXN"),
    availability: z
      .enum(propertyAvailabilityValues, { error: "Estado no válido" })
      .default("AVAILABLE"),
    usableArea: optionalNumber(z.number().positive("Debe ser mayor que cero").max(1_000_000)),
    totalArea: optionalNumber(z.number().positive("Debe ser mayor que cero").max(1_000_000)),
    bedrooms: optionalNumber(z.number().int("Debe ser un entero").min(0).max(50)),
    bathrooms: optionalNumber(z.number().int("Debe ser un entero").min(0).max(50)),
    parkingSpots: optionalNumber(z.number().int("Debe ser un entero").min(0).max(50)),
    age: optionalNumber(z.number().int("Debe ser un entero").min(0).max(500)),
    address: requiredText("La dirección", 200),
    commune: requiredText("La colonia", 100),
    city: requiredText("La ciudad", 100),
    region: requiredText("El estado", 100),
    isPublished: z.boolean().default(false),
    isFeatured: z.boolean().default(false),
  })
  .refine(
    ({ usableArea, totalArea }) =>
      usableArea === null || totalArea === null || usableArea <= totalArea,
    { path: ["usableArea"], message: "La superficie útil no puede superar la total" },
  );

export type PropertyInput = z.output<typeof propertyInputSchema>;

export const ADMIN_PROPERTIES_PAGE_SIZE = 10;

export const adminPropertyStatusValues = ["all", "published", "draft"] as const;
export type AdminPropertyStatus = (typeof adminPropertyStatusValues)[number];

/** Parámetros de GET /api/admin/properties. */
export const adminPropertyListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(ADMIN_PROPERTIES_PAGE_SIZE),
    search: z
      .string()
      .trim()
      .max(100, "Máximo 100 caracteres")
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    status: z.enum(adminPropertyStatusValues).default("all"),
    ...advancedFilterShape,
  })
  .refine(priceRangeCheck.check, priceRangeCheck.params)
  .refine(publishedRangeCheck.check, publishedRangeCheck.params);

export type AdminPropertyListQuery = z.output<typeof adminPropertyListQuerySchema>;

/** Elemento de la lista de administración: incluye borradores. */
export type AdminPropertyListItemDto = PropertySummaryDto & {
  isPublished: boolean;
  updatedAt: string;
};

/** Propiedad completa para editar, en cualquier estado de publicación. */
export type AdminPropertyDto = PropertyDetailDto & { isPublished: boolean };
