import { container } from "@/container";

const { invoiceController, withAuth } = container;

export const GET = withAuth((user, request: Request) => invoiceController.list(user.id, request));
export const POST = withAuth((user, request: Request) => invoiceController.create(user.id, request));
