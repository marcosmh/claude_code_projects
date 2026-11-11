"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/cn";
import { buildLoginPath } from "@/lib/route-access";

type FavoriteButtonProps = {
  propertyId: string;
  propertyTitle: string;
  className?: string;
};

/**
 * Corazón para guardar o quitar una propiedad de favoritos. Un visitante que lo pulsa va a
 * iniciar sesión y vuelve a la página en la que estaba.
 */
export function FavoriteButton({ propertyId, propertyTitle, className }: FavoriteButtonProps) {
  const router = useRouter();
  const currentPathname = usePathname();
  const { isSignedIn, isAdmin, isFavorite, toggleFavorite } = useFavorites();
  const [isSaving, setIsSaving] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const isSaved = isFavorite(propertyId);

  const handleClick = async () => {
    if (!isSignedIn) {
      router.push(buildLoginPath(currentPathname));
      return;
    }
    setIsSaving(true);
    setHasFailed(false);
    try {
      await toggleFavorite(propertyId);
    } catch {
      setHasFailed(true);
    } finally {
      setIsSaving(false);
    }
  };

  // Un ADMIN no usa favoritos: el corazón no se muestra.
  if (isAdmin) return null;

  return (
    <>
      <button
        type="button"
        aria-pressed={isSaved}
        aria-label={
          isSaved
            ? `Quitar de favoritos: ${propertyTitle}`
            : `Guardar en favoritos: ${propertyTitle}`
        }
        disabled={isSaving}
        onClick={handleClick}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full border border-foreground/15 bg-surface/95 shadow-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60",
          className,
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={cn("size-5", isSaved ? "fill-danger text-danger" : "fill-none")}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        >
          <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.4 4.5 6.9 4.5c2 0 3.5 1.1 5.1 3 1.6-1.9 3.1-3 5.1-3 3.5 0 5.5 3.4 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
        </svg>
      </button>
      {hasFailed && (
        <p role="alert" className="sr-only">
          No pudimos actualizar tus favoritos. Inténtalo de nuevo.
        </p>
      )}
    </>
  );
}
