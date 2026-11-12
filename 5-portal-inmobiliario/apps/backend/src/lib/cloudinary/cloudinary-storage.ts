import { createHash } from "node:crypto";
import { BadGatewayError, ServiceUnavailableError } from "@/lib/errors";

/** Carpeta de Cloudinary donde se guardan las imágenes de las propiedades. */
export const DEFAULT_CLOUDINARY_FOLDER = "propiedades-claude";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

export type StoredImage = { url: string; publicId: string };

export type ImageUpload = { bytes: Uint8Array; contentType: string; filename: string };

/** Almacenamiento de imágenes; hoy lo implementa Cloudinary. */
export type ImageStorage = {
  upload(file: ImageUpload): Promise<StoredImage>;
  /** Elimina la imagen; no falla si ya no existe. */
  remove(publicId: string): Promise<void>;
};

/** Lee la configuración del entorno; null si falta alguna credencial. */
export function loadCloudinaryConfig(
  env: Record<string, string | undefined> = process.env,
): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    apiKey,
    apiSecret,
    folder: env.CLOUDINARY_FOLDER?.trim() || DEFAULT_CLOUDINARY_FOLDER,
  };
}

/**
 * Firma de Cloudinary: SHA-1 de los parámetros (sin `file`, `api_key` ni `resource_type`) ordenados
 * por nombre y unidos como `a=1&b=2`, seguidos del secreto.
 */
export function signParameters(parameters: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(parameters)
    .sort()
    .map((key) => `${key}=${parameters[key]}`)
    .join("&");
  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

const API_ORIGIN = "https://api.cloudinary.com/v1_1";

type CloudinaryStorageDependencies = {
  /** Se evalúa en cada operación para que el entorno pueda cambiar (y para las pruebas). */
  getConfig?: () => CloudinaryConfig | null;
  fetchImplementation?: typeof fetch;
  now?: () => number;
};

/** Cliente mínimo de la API REST de Cloudinary: subida y eliminación firmadas desde el servidor. */
export function createCloudinaryStorage({
  getConfig = () => loadCloudinaryConfig(),
  fetchImplementation = (input, init) => fetch(input, init),
  now = () => Date.now(),
}: CloudinaryStorageDependencies = {}): ImageStorage {
  function requireConfig(): CloudinaryConfig {
    const config = getConfig();
    if (config === null) {
      throw new ServiceUnavailableError("El almacenamiento de imágenes no está configurado");
    }
    return config;
  }

  const timestamp = () => String(Math.floor(now() / 1000));

  return {
    async upload({ bytes, contentType, filename }) {
      const config = requireConfig();
      const signedParameters = { folder: config.folder, timestamp: timestamp() };
      const body = new FormData();
      body.set("file", new Blob([bytes as BlobPart], { type: contentType }), filename);
      body.set("api_key", config.apiKey);
      body.set("folder", signedParameters.folder);
      body.set("timestamp", signedParameters.timestamp);
      body.set("signature", signParameters(signedParameters, config.apiSecret));

      let response: Response;
      try {
        response = await fetchImplementation(`${API_ORIGIN}/${config.cloudName}/image/upload`, {
          method: "POST",
          body,
        });
      } catch (error) {
        console.error("Cloudinary: fallo de red al subir:", error);
        throw new BadGatewayError("No se pudo subir la imagen al almacenamiento");
      }
      const result = (await response.json().catch(() => null)) as {
        secure_url?: unknown;
        public_id?: unknown;
        error?: { message?: unknown };
      } | null;
      if (
        !response.ok ||
        typeof result?.secure_url !== "string" ||
        typeof result.public_id !== "string"
      ) {
        console.error("Cloudinary: respuesta inválida al subir:", response.status, result?.error);
        throw new BadGatewayError("No se pudo subir la imagen al almacenamiento");
      }
      return { url: result.secure_url, publicId: result.public_id };
    },

    async remove(publicId) {
      const config = requireConfig();
      const signedParameters = { public_id: publicId, timestamp: timestamp() };
      const body = new URLSearchParams({
        ...signedParameters,
        api_key: config.apiKey,
        signature: signParameters(signedParameters, config.apiSecret),
      });
      let response: Response;
      try {
        response = await fetchImplementation(`${API_ORIGIN}/${config.cloudName}/image/destroy`, {
          method: "POST",
          body,
        });
      } catch (error) {
        console.error("Cloudinary: fallo de red al eliminar:", error);
        throw new BadGatewayError("No se pudo eliminar la imagen del almacenamiento");
      }
      const result = (await response.json().catch(() => null)) as { result?: unknown } | null;
      if (!response.ok || (result?.result !== "ok" && result?.result !== "not found")) {
        console.error("Cloudinary: respuesta inválida al eliminar:", response.status, result);
        throw new BadGatewayError("No se pudo eliminar la imagen del almacenamiento");
      }
    },
  };
}
