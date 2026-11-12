import type { Metadata } from "next";
import type { PropertyDetailDto } from "@portal/shared-types";
import { formatOperation, formatPrice, formatPropertyType } from "./format";

export const SITE_NAME = "Portal Inmobiliario";
const MAXIMUM_DESCRIPTION_LENGTH = 160;

/** Recorta en un límite de palabra y agrega «…» solo si hubo recorte. */
export function truncateText(text: string, maximumLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maximumLength) return normalized;
  const cut = normalized.slice(0, maximumLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maximumLength / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Metadata genérica para propiedades inexistentes o no disponibles (no se indexa). */
export function buildFallbackMetadata(): Metadata {
  return {
    title: `Propiedad no encontrada | ${SITE_NAME}`,
    description: "Esta propiedad no está disponible.",
    robots: { index: false },
  };
}

/** Título, descripción, Open Graph e imagen principal de la página de detalle. */
export function buildPropertyMetadata(property: PropertyDetailDto): Metadata {
  const title = `${property.title} | ${SITE_NAME}`;
  const summary = `${formatPropertyType(property.type)} en ${formatOperation(
    property.operation,
  ).toLowerCase()} en ${property.commune}, ${property.city}. ${formatPrice(
    property.price,
    property.currency,
    property.operation,
  )}.`;
  const description = truncateText(
    `${summary} ${property.description}`,
    MAXIMUM_DESCRIPTION_LENGTH,
  );
  const image =
    property.images.find((candidate) => candidate.isPrimary) ?? property.images[0] ?? null;

  return {
    title,
    description,
    alternates: { canonical: `/properties/${encodeURIComponent(property.id)}` },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "es_MX",
      title,
      description,
      url: `/properties/${encodeURIComponent(property.id)}`,
      ...(image && { images: [{ url: image.url, alt: property.title }] }),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image && { images: [image.url] }),
    },
  };
}
