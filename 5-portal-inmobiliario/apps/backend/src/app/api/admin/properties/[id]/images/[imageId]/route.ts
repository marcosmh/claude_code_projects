import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { propertyImageService } from "@/services/services";
import { setPrimaryImageInputSchema } from "@portal/shared-types";

type ImageParams = { id: string; imageId: string };

const noStore = { "Cache-Control": "no-store" };

/** Marca la imagen como la principal de la propiedad; devuelve la lista actualizada. */
export const PATCH = withRole<ImageParams>("ADMIN", async (request, { params }) => {
  const { id, imageId } = await params;
  const { response } = await parseJsonBody(
    request,
    setPrimaryImageInputSchema,
    "Datos de imagen no válidos",
  );
  if (response) return response;

  return NextResponse.json(await propertyImageService.setPrimaryImage(id, imageId), {
    headers: noStore,
  });
});

/** Elimina la imagen de Cloudinary y de PostgreSQL (204). */
export const DELETE = withRole<ImageParams>("ADMIN", async (_request, { params }) => {
  const { id, imageId } = await params;
  await propertyImageService.deleteImage(id, imageId);
  return new Response(null, { status: 204, headers: noStore });
});
