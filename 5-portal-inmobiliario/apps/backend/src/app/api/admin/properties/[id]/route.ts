import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { adminPropertyService } from "@/services/services";
import { propertyInputSchema } from "@portal/shared-types";

type PropertyParams = { id: string };

const noStore = { "Cache-Control": "no-store" };

/** Propiedad en cualquier estado de publicación (404 si no existe). */
export const GET = withRole<PropertyParams>("ADMIN", async (_request, { params }) => {
  const { id } = await params;
  return NextResponse.json(await adminPropertyService.getProperty(id), { headers: noStore });
});

/** Reemplaza los campos editables de la propiedad. */
export const PUT = withRole<PropertyParams>("ADMIN", async (request, { params }) => {
  const { id } = await params;
  const { data, response } = await parseJsonBody(
    request,
    propertyInputSchema,
    "Datos de propiedad no válidos",
  );
  if (response) return response;

  return NextResponse.json(await adminPropertyService.updateProperty(id, data), {
    headers: noStore,
  });
});

/** Elimina la propiedad (204). */
export const DELETE = withRole<PropertyParams>("ADMIN", async (_request, { params }) => {
  const { id } = await params;
  await adminPropertyService.deleteProperty(id);
  return new Response(null, { status: 204, headers: noStore });
});
