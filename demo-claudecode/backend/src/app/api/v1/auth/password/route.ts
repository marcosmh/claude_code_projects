import { container } from "@/container";

export const POST = container.withAuth((user, request: Request) => container.authController.changePassword(user, request));
