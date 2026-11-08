import type { Currency, PropertyOperation } from "@/types/property";

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
