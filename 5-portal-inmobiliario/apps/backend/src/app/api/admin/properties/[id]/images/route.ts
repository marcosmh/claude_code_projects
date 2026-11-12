import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { propertyImageService } from "@/services/services";
import { PROPERTY_IMAGE_MAX_BYTES, reorderImagesInputSchema } from "@portal/shared-types";

type PropertyParams = { id: string };

/**
 * Sube una imagen (`multipart/form-data`, campo `file`) a Cloudinary y guarda su URL y `publicId`.
 * 201 con la imagen creada; 400, 404, 413, 415, 502 o 503 según el caso.
 */
export const POST = withRole<PropertyParams>("ADMIN", async (request, { params }) => {
  const { id } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("La solicitud debe ser multipart/form-data con el campo «file»", 400);
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("Falta el archivo en el campo «file»", 400);
  }
  // Evita leer en memoria un archivo enorme: el servicio vuelve a validar los bytes reales.
  if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
    return errorResponse(
      `La imagen supera el máximo de ${PROPERTY_IMAGE_MAX_BYTES / (1024 * 1024)} MB`,
      413,
    );
  }

  const image = await propertyImageService.uploadImage(id, {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type,
    filename: file.name,
  });
  return NextResponse.json(image, { status: 201, headers: { "Cache-Control": "no-store" } });
});

/** Reordena las imágenes: el cuerpo lista todos los ids en el orden deseado; devuelve la lista. */
export const PUT = withRole<PropertyParams>("ADMIN", async (request, { params }) => {
  const { id } = await params;
  const { data, response } = await parseJsonBody(
    request,
    reorderImagesInputSchema,
    "Datos de orden no válidos",
  );
  if (response) return response;

  return NextResponse.json(await propertyImageService.reorderImages(id, data.imageIds), {
    headers: { "Cache-Control": "no-store" },
  });
});
