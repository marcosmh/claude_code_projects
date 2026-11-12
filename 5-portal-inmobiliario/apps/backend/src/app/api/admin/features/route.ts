import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { featureService } from "@/services/services";
import { featureInputSchema } from "@portal/shared-types";

const noStore = { "Cache-Control": "no-store" };

/** Catálogo de características ordenado por nombre (solo ADMIN). */
export const GET = withRole("ADMIN", async () =>
  NextResponse.json(await featureService.listFeatures(), { headers: noStore }),
);

/** Crea una característica nueva (201); 409 si ya existe. */
export const POST = withRole("ADMIN", async (request) => {
  const { data, response } = await parseJsonBody(
    request,
    featureInputSchema,
    "Datos de característica no válidos",
  );
  if (response) return response;

  return NextResponse.json(await featureService.createFeature(data.name), {
    status: 201,
    headers: noStore,
  });
});
