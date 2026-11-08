import type { Currency, PropertyOperation, PropertyType } from "@portal/shared-types";

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
  return operation === "RENT" ? `${formattedPrice} / mes` : formattedPrice;
}

export function formatArea(squareMeters: number): string {
  return `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(squareMeters)} m²`;
}

export function formatBathrooms(count: number): string {
  return `${count} ${count === 1 ? "baño" : "baños"}`;
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
