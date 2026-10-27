import { container } from "@/container";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = container.withAuth(async (user, request: Request, { params }: Ctx) =>
  container.invoiceController.updateStatus(user.id, (await params).id, request),
);
