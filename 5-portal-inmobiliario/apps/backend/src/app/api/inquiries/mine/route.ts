import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/api-response";
import { withRole } from "@/lib/http/with-role";
import { inquiryService } from "@/services/services";
import { userInquiryListQuerySchema } from "@portal/shared-types";

/** Página de consultas de la persona de la sesión (siempre filtradas por su userId). */
export const GET = withRole(
  "USER",
  async (request, { user }) => {
    const parsedQuery = userInquiryListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsedQuery.success) {
      return errorResponse(
        "Parámetros de consulta inválidos",
        400,
        parsedQuery.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
    const inquiries = await inquiryService.listUserInquiries(user.id, parsedQuery.data);
    return NextResponse.json(inquiries, { headers: { "Cache-Control": "no-store" } });
  },
  { exact: true },
);
