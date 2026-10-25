import { container } from "@/container";
import { withErrorHandler } from "@/middleware/withErrorHandler";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandler(async (request: Request, { params }: Ctx) =>
  container.invoiceController.updateStatus((await params).id, request),
);
