import { container } from "@/container";
import { withErrorHandler } from "@/middleware/withErrorHandler";

const { invoiceController } = container;
type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (_request: Request, { params }: Ctx) =>
  invoiceController.get((await params).id),
);
export const PUT = withErrorHandler(async (request: Request, { params }: Ctx) =>
  invoiceController.update((await params).id, request),
);
export const DELETE = withErrorHandler(async (_request: Request, { params }: Ctx) =>
  invoiceController.remove((await params).id),
);
