import { buildLocationQuery, buildMapsEmbedUrl, buildMapsSearchUrl } from "@/lib/maps";

type PropertyMapProps = {
  title: string;
  address: string;
  commune: string;
  city: string;
  region: string;
};

/**
 * Ubicación de la propiedad con Google Maps a partir de su dirección textual.
 * La clave (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) es una clave de navegador restringida
 * por dominio; sin ella se muestra solo el enlace a Google Maps.
 */
export function PropertyMap({ title, ...location }: PropertyMapProps) {
  const embedUrl = buildMapsEmbedUrl(location, process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  return (
    <section aria-labelledby="property-map-title" className="mt-8">
      <h2 id="property-map-title" className="text-xl font-semibold">
        Ubicación
      </h2>
      <p className="mt-1 text-foreground/70">{buildLocationQuery(location)}</p>
      {embedUrl && (
        <iframe
          title={`Mapa de ubicación de ${title}`}
          src={embedUrl}
          loading="lazy"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="mt-3 aspect-[16/10] w-full rounded-xl border border-foreground/10 bg-foreground/5"
        />
      )}
      <a
        href={buildMapsSearchUrl(location)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Abrir en Google Maps
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      </a>
    </section>
  );
}
