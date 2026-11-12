import type {
  Currency,
  PropertyAvailability,
  PropertyOperation,
  PropertyType,
} from "@portal/shared-types";

export function formatPrice(
  price: number,
  currency: Currency,
  operation: PropertyOperation,
): string {
  const formattedPrice = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
  return operation === "RENT" ? `${formattedPrice}\u00a0/\u00a0mes` : formattedPrice;
}

export function formatArea(squareMeters: number): string {
  return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(squareMeters)}\u00a0m²`;
}

export function formatBathrooms(count: number): string {
  return `${count}\u00a0${count === 1 ? "baño" : "baños"}`;
}

const propertyTypeLabels: Record<PropertyType, string> = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  LAND: "Terreno",
  OFFICE: "Oficina",
  COMMERCIAL: "Local comercial",
  OTHER: "Otro",
};

export function formatPropertyType(type: PropertyType): string {
  return propertyTypeLabels[type];
}

export function formatOperation(operation: PropertyOperation): string {
  return operation === "SALE" ? "Venta" : "Arriendo";
}

const availabilityLabels: Record<PropertyAvailability, string> = {
  AVAILABLE: "Disponible",
  SOLD: "Vendida",
  RENTED: "Rentada",
};

export function formatAvailability(availability: PropertyAvailability): string {
  return availabilityLabels[availability];
}
