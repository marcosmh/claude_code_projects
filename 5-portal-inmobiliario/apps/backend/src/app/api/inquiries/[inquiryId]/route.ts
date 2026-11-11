import { withRole } from "@/lib/http/with-role";
import { inquiryService } from "@/services/services";

type InquiryParams = { inquiryId: string };

/** Elimina una consulta propia (204). 404 si no existe o pertenece a otra persona. */
export const DELETE = withRole<InquiryParams>("USER", async (_request, { user, params }) => {
  const { inquiryId } = await params;
  await inquiryService.deleteUserInquiry(user.id, inquiryId);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
});
