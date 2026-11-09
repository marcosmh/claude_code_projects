type PropertyLocation = {
  address: string;
  commune: string;
  city: string;
  region: string;
};

/** Ubicación textual completa; no requiere coordenadas manuales. */
export function buildLocationQuery({ address, commune, city, region }: PropertyLocation): string {
  return [address, commune, city, region, "México"]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join(", ");
}

/** Enlace para abrir la ubicación en Google Maps (no requiere clave de API). */
export function buildMapsSearchUrl(location: PropertyLocation): string {
  const query = encodeURIComponent(buildLocationQuery(location));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** URL del mapa incrustado (Maps Embed API). Devuelve null si no hay clave configurada. */
export function buildMapsEmbedUrl(
  location: PropertyLocation,
  apiKey: string | undefined,
): string | null {
  const key = apiKey?.trim();
  if (!key) return null;
  const query = encodeURIComponent(buildLocationQuery(location));
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${query}&language=es&region=MX`;
}
