"use client";

import Image from "next/image";
import { imageLoaderFor } from "@/lib/image-loader";
import { useId, useRef, useState } from "react";
import {
  ApiRequestError,
  deletePropertyImage,
  reorderPropertyImages,
  setPrimaryPropertyImage,
  uploadPropertyImage,
} from "@portal/api-client";
import {
  PROPERTY_IMAGE_MAX_BYTES,
  propertyImageContentTypes,
  type PropertyImageDto,
} from "@portal/shared-types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type PropertyImagesManagerProps = {
  propertyId: string;
  title: string;
  images: readonly PropertyImageDto[];
  /** Se llama tras cualquier cambio para que el padre vuelva a cargar la propiedad. */
  onChanged: () => Promise<unknown> | void;
};

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const iconButtonClassName = `inline-flex size-9 items-center justify-center rounded-md border border-foreground/20 bg-surface transition-colors hover:bg-foreground/5 disabled:opacity-40 ${focusClassName}`;
const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const maxSizeMegabytes = PROPERTY_IMAGE_MAX_BYTES / (1024 * 1024);

function describeError(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError && error.status < 500 ? error.message : fallback;
}

/** Gestor de imágenes de una propiedad: subir varias, elegir la principal, ordenar y eliminar. */
export function PropertyImagesManager({
  propertyId,
  title,
  images,
  onChanged,
}: PropertyImagesManagerProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [pendingDeletion, setPendingDeletion] = useState<PropertyImageDto | null>(null);

  /** Ejecuta una acción de escritura y recarga la propiedad, mostrando el error si falla. */
  const runAction = async (action: () => Promise<unknown>, fallback: string, success: string) => {
    setIsBusy(true);
    setMessages([]);
    try {
      await action();
      await onChanged();
      setStatus(success);
    } catch (error) {
      setMessages([describeError(error, fallback)]);
    } finally {
      setIsBusy(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setIsBusy(true);
    setStatus("");
    const problems: string[] = [];
    let uploaded = 0;
    for (const file of files) {
      if (!(propertyImageContentTypes as readonly string[]).includes(file.type)) {
        problems.push(`${file.name}: formato no admitido (usa JPG, PNG o WebP).`);
        continue;
      }
      if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
        problems.push(`${file.name}: supera el máximo de ${maxSizeMegabytes} MB.`);
        continue;
      }
      try {
        await uploadPropertyImage(propertyId, file);
        uploaded += 1;
      } catch (error) {
        problems.push(`${file.name}: ${describeError(error, "no pudimos subirla.")}`);
      }
    }
    if (uploaded > 0) await onChanged();
    setMessages(problems);
    setStatus(uploaded > 0 ? `Se subieron ${uploaded} imagen(es).` : "");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsBusy(false);
  };

  const move = (index: number, offset: -1 | 1) => {
    const ids = images.map((image) => image.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + offset, 0, moved);
    return runAction(
      () => reorderPropertyImages(propertyId, ids),
      "No pudimos guardar el orden.",
      "Orden actualizado.",
    );
  };

  const confirmDeletion = async () => {
    if (!pendingDeletion) return;
    const image = pendingDeletion;
    await runAction(
      () => deletePropertyImage(propertyId, image.id),
      "No pudimos eliminar la imagen.",
      "Imagen eliminada.",
    );
    setPendingDeletion(null);
  };

  return (
    <section
      aria-labelledby={`${inputId}-title`}
      className="rounded-lg border border-foreground/15 bg-surface p-5"
    >
      <h2 id={`${inputId}-title`} className="text-lg font-semibold">
        Imágenes
      </h2>
      <p className="mt-1 text-sm text-foreground/70">
        La imagen principal se muestra en el catálogo. JPG, PNG o WebP de hasta {maxSizeMegabytes}{" "}
        MB.
      </p>

      <div className="mt-4">
        <label htmlFor={inputId} className="block text-sm font-medium">
          Agregar imágenes
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          multiple
          accept={propertyImageContentTypes.join(",")}
          disabled={isBusy}
          onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))}
          className={`mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground ${focusClassName}`}
        />
      </div>

      <p role="status" className="mt-3 text-sm text-foreground/70">
        {isBusy ? "Procesando…" : status}
      </p>
      {messages.length > 0 && (
        <ul role="alert" className="mt-2 list-disc pl-5 text-sm text-danger">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {images.length === 0 ? (
        <p className="mt-4 text-sm text-foreground/70">Esta propiedad todavía no tiene imágenes.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.id} className="overflow-hidden rounded-lg border border-foreground/15">
              <div className="relative aspect-4/3 bg-foreground/5">
                <Image
                  src={image.url}
                  loader={imageLoaderFor(image.url)}
                  alt={`${title}: imagen ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 220px, 50vw"
                  className="object-cover"
                />
                {image.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-md bg-badge px-2 py-0.5 text-xs font-semibold text-badge-foreground">
                    Principal
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2 p-2">
                <button
                  type="button"
                  disabled={isBusy || image.isPrimary}
                  aria-label={`Marcar como principal la imagen ${index + 1}`}
                  title="Marcar como principal"
                  onClick={() =>
                    void runAction(
                      () => setPrimaryPropertyImage(propertyId, image.id),
                      "No pudimos cambiar la imagen principal.",
                      "Imagen principal actualizada.",
                    )
                  }
                  className={iconButtonClassName}
                >
                  <svg {...iconProps} fill={image.isPrimary ? "currentColor" : "none"}>
                    <path d="m12 3 2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 9.4l6-.9Z" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={isBusy || index === 0}
                  aria-label={`Mover antes la imagen ${index + 1}`}
                  title="Mover antes"
                  onClick={() => void move(index, -1)}
                  className={iconButtonClassName}
                >
                  <svg {...iconProps}>
                    <path d="M19 12H5M11 6l-6 6 6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={isBusy || index === images.length - 1}
                  aria-label={`Mover después la imagen ${index + 1}`}
                  title="Mover después"
                  onClick={() => void move(index, 1)}
                  className={iconButtonClassName}
                >
                  <svg {...iconProps}>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  aria-label={`Eliminar la imagen ${index + 1}`}
                  title="Eliminar"
                  onClick={() => setPendingDeletion(image)}
                  className={`${iconButtonClassName} text-danger`}
                >
                  <svg {...iconProps}>
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingDeletion && (
        <ConfirmDialog
          title="¿Eliminar esta imagen?"
          description="Se borrará de Cloudinary y de la propiedad. Esta acción no se puede deshacer."
          confirmLabel="Sí, eliminar"
          cancelLabel="No, cancelar"
          isBusy={isBusy}
          onConfirm={() => void confirmDeletion()}
          onCancel={() => setPendingDeletion(null)}
        />
      )}
    </section>
  );
}
