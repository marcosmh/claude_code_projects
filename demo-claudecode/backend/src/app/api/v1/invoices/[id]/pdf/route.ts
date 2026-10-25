import { container } from "@/container";
import { withErrorHandler } from "@/middleware/withErrorHandler";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandler(async (_request: Request, { params }: Ctx) =>
  container.invoiceController.pdf((await params).id),
);
