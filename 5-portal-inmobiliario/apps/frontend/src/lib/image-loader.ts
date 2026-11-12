/**
 * Cargador de `next/image` para Cloudinary (spec §51): la transformación se pide al CDN
 * (`f_auto,q_auto,c_limit,w_N`), así el navegador descarga una versión del tamaño exacto y en el
 * mejor formato, no el original (hasta 5 MB) ni una copia que el servidor de Next.js tendría que
 * descargar y reprocesar. Las demás imágenes (locales y del seed) siguen con el optimizador de
 * Next.js: un cargador global lo desactivaría (`/_next/image` responde 404), por eso se pasa por imagen.
 */

const CLOUDINARY_HOST = "res.cloudinary.com";
const UPLOAD_SEGMENT = "/image/upload/";

type LoaderProps = { src: string; width: number; quality?: number };

/** Inserta la transformación tras `/image/upload/`; null si no es una URL de Cloudinary. */
export function buildCloudinaryUrl({ src, width, quality }: LoaderProps): string | null {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.hostname !== CLOUDINARY_HOST) return null;
  const markerIndex = url.pathname.indexOf(UPLOAD_SEGMENT);
  if (markerIndex === -1) return null;

  const qualityTransformation = quality ? `q_${quality}` : "q_auto";
  const transformation = `f_auto,${qualityTransformation},c_limit,w_${width}`;
  const insertAt = markerIndex + UPLOAD_SEGMENT.length;
  url.pathname = `${url.pathname.slice(0, insertAt)}${transformation}/${url.pathname.slice(insertAt)}`;
  return url.toString();
}

/** Cargador para `next/image`; solo se usa con URLs de Cloudinary (ver `imageLoaderFor`). */
export function cloudinaryLoader(props: LoaderProps): string {
  return buildCloudinaryUrl(props) ?? props.src;
}

/** Cargador a pasar a `<Image loader>`: el de Cloudinary para sus URLs y `undefined` (optimizador de Next.js) para el resto. */
export function imageLoaderFor(src: string): typeof cloudinaryLoader | undefined {
  return buildCloudinaryUrl({ src, width: 1 }) === null ? undefined : cloudinaryLoader;
}
