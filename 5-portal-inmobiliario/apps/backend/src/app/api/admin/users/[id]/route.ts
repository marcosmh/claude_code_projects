import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/http/parse-body";
import { withRole } from "@/lib/http/with-role";
import { adminUserService } from "@/services/services";
import { updateAdminUserInputSchema } from "@portal/shared-types";

type UserParams = { id: string };

const noStore = { "Cache-Control": "no-store" };

/** Detalle de un usuario (solo ADMIN). */
export const GET = withRole<UserParams>("ADMIN", async (_request, { params }) => {
  const { id } = await params;
  return NextResponse.json(await adminUserService.getUser(id), { headers: noStore });
});

/** Activa o desactiva la cuenta y/o cambia el rol; un ADMIN no puede modificarse a sí mismo (403). */
export const PATCH = withRole<UserParams>("ADMIN", async (request, { params, user }) => {
  const { id } = await params;
  const { data, response } = await parseJsonBody(
    request,
    updateAdminUserInputSchema,
    "Datos de usuario no válidos",
  );
  if (response) return response;

  return NextResponse.json(await adminUserService.updateUser(user.id, id, data), {
    headers: noStore,
  });
});
