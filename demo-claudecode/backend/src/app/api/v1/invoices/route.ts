import { container } from "@/container";
import { withErrorHandler } from "@/middleware/withErrorHandler";

const { invoiceController } = container;

export const GET = withErrorHandler((request: Request) => invoiceController.list(request));
export const POST = withErrorHandler((request: Request) => invoiceController.create(request));
