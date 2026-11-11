"use client";

import useSWR from "swr";
import { addFavorite, favoritesUrl, fetchFavorites, removeFavorite } from "@portal/api-client";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/**
 * Favoritas de la persona con sesión. Sin sesión no consulta (clave nula). Todas las instancias
 * comparten la misma clave de SWR, así que guardar una propiedad actualiza todas las tarjetas.
 */
export function useFavorites() {
  const { user } = useCurrentUser();
  // Un ADMIN no usa favoritos (spec §38): no se consultan.
  const { data, mutate } = useSWR(user?.role === "USER" ? favoritesUrl : null, fetchFavorites, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const favoriteIds = new Set((data ?? []).map((favorite) => favorite.id));

  return {
    isSignedIn: Boolean(user),
    isAdmin: user?.role === "ADMIN",
    favorites: data,
    isFavorite: (propertyId: string) => favoriteIds.has(propertyId),
    /** Guarda o quita la propiedad y refresca la lista compartida. Lanza si la API falla. */
    async toggleFavorite(propertyId: string) {
      if (favoriteIds.has(propertyId)) {
        await removeFavorite(propertyId);
      } else {
        await addFavorite(propertyId);
      }
      await mutate();
    },
  };
}
