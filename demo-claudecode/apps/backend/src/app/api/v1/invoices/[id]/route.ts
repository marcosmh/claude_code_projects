import { container } from "@/container";

const { invoiceController, withAuth } = container;
type Ctx = { params: Promise<{ id: string }> };

export const GET = withAuth(async (user, _request: Request, { params }: Ctx) =>
  invoiceController.get(user.id, (await params).id),
);
export const PUT = withAuth(async (user, request: Request, { params }: Ctx) =>
  invoiceController.update(user.id, (await params).id, request),
);
export const DELETE = withAuth(async (user, _request: Request, { params }: Ctx) =>
  invoiceController.remove(user.id, (await params).id),
);
