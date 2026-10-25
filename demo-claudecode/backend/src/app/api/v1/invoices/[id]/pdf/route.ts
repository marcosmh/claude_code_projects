import { container } from "@/container";

type Ctx = { params: Promise<{ id: string }> };

export const GET = container.withAuth(async (user, _request: Request, { params }: Ctx) =>
  container.invoiceController.pdf(user.id, (await params).id),
);
