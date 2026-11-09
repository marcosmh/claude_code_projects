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

/**
 * URL del mapa incrustado. Con clave usa la Maps Embed API oficial; sin clave usa el
 * mapa incrustable público de Google Maps, así la vista previa siempre se muestra.
 */
export function buildMapsEmbedUrl(location: PropertyLocation, apiKey: string | undefined): string {
  const query = encodeURIComponent(buildLocationQuery(location));
  const key = apiKey?.trim();
  if (!key) return `https://maps.google.com/maps?q=${query}&hl=es&z=15&output=embed`;
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${query}&language=es&region=MX`;
}
