import { propertyInputSchema, type AdminPropertyDto } from "@portal/shared-types";
import { z } from "zod";

/** Texto vacío → undefined (campo obligatorio ausente); si no, el número escrito (NaN si no lo es). */
function toRequiredNumber(text: string): number | undefined {
  const trimmed = text.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

/** Texto vacío → null (campo opcional sin valor). */
function toOptionalNumber(text: string): number | null {
  const trimmed = text.trim();
  return trimmed === "" ? null : Number(trimmed);
}

const numericText = z.string();

/**
 * Esquema del formulario de propiedad. Los `input` HTML entregan texto: se convierte a números y el
 * resultado se valida con el mismo esquema que usa la API, de modo que el formulario nunca acepta
 * lo que el backend rechazaría.
 */
export const propertyFormSchema = z
  .object({
    title: z.string(),
    description: z.string(),
    operation: z.string(),
    type: z.string(),
    price: numericText,
    currency: z.string(),
    availability: z.string(),
    usableArea: numericText,
    totalArea: numericText,
    bedrooms: numericText,
    bathrooms: numericText,
    parkingSpots: numericText,
    age: numericText,
    address: z.string(),
    commune: z.string(),
    city: z.string(),
    region: z.string(),
    isPublished: z.boolean(),
    isFeatured: z.boolean(),
  })
  .transform(
    (values) =>
      ({
        ...values,
        price: toRequiredNumber(values.price),
        usableArea: toOptionalNumber(values.usableArea),
        totalArea: toOptionalNumber(values.totalArea),
        bedrooms: toOptionalNumber(values.bedrooms),
        bathrooms: toOptionalNumber(values.bathrooms),
        parkingSpots: toOptionalNumber(values.parkingSpots),
        age: toOptionalNumber(values.age),
      }) as z.input<typeof propertyInputSchema>,
  )
  .pipe(propertyInputSchema);

export type PropertyFormValues = z.input<typeof propertyFormSchema>;
export type PropertyFormData = z.output<typeof propertyFormSchema>;

export const emptyPropertyFormValues: PropertyFormValues = {
  title: "",
  description: "",
  operation: "SALE",
  type: "HOUSE",
  price: "",
  currency: "MXN",
  availability: "AVAILABLE",
  usableArea: "",
  totalArea: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpots: "",
  age: "",
  address: "",
  commune: "",
  city: "",
  region: "",
  isPublished: false,
  isFeatured: false,
};

const numberToText = (value: number | null): string => (value === null ? "" : String(value));

/** Valores iniciales del formulario de edición a partir de la propiedad guardada. */
export function propertyToFormValues(property: AdminPropertyDto): PropertyFormValues {
  return {
    title: property.title,
    description: property.description,
    operation: property.operation,
    type: property.type,
    price: String(property.price),
    currency: property.currency,
    availability: property.availability,
    usableArea: numberToText(property.usableArea),
    totalArea: numberToText(property.totalArea),
    bedrooms: numberToText(property.bedrooms),
    bathrooms: numberToText(property.bathrooms),
    parkingSpots: numberToText(property.parkingSpots),
    age: numberToText(property.age),
    address: property.address,
    commune: property.commune,
    city: property.city,
    region: property.region,
    isPublished: property.isPublished,
    isFeatured: property.isFeatured,
  };
}
