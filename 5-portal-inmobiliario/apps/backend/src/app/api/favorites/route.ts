import { NextResponse } from "next/server";
import { withRole } from "@/lib/http/with-role";
import { favoriteService } from "@/services/services";

/** Propiedades que la persona de la sesión guardó como favoritas. */
export const GET = withRole("USER", async (_request, { user }) => {
  const favorites = await favoriteService.listFavorites(user.id);
  return NextResponse.json(favorites, { headers: { "Cache-Control": "no-store" } });
});
