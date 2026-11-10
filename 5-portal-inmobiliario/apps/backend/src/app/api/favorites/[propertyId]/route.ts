import { NextResponse } from "next/server";
import { withRole } from "@/lib/http/with-role";
import { favoriteService } from "@/services/services";

type FavoriteParams = { propertyId: string };

/** Guarda la propiedad (idempotente). 404 si no existe o no está publicada. */
export const PUT = withRole<FavoriteParams>("USER", async (_request, { user, params }) => {
  const { propertyId } = await params;
  const property = await favoriteService.addFavorite(user.id, propertyId);
  return NextResponse.json(property, { headers: { "Cache-Control": "no-store" } });
});

/** Quita la propiedad de favoritos (204 aunque no estuviera guardada). */
export const DELETE = withRole<FavoriteParams>("USER", async (_request, { user, params }) => {
  const { propertyId } = await params;
  await favoriteService.removeFavorite(user.id, propertyId);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
});
