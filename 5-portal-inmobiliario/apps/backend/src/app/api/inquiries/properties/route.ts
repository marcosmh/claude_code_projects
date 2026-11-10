import { NextResponse } from "next/server";
import { withRole } from "@/lib/http/with-role";
import { inquiryService } from "@/services/services";

/** Propiedades sobre las que la persona de la sesión envió consultas. */
export const GET = withRole("USER", async (_request, { user }) => {
  const properties = await inquiryService.listInquiredProperties(user.id);
  return NextResponse.json(properties, { headers: { "Cache-Control": "no-store" } });
});
