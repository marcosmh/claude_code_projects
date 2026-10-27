import { container } from "@/container";

export const GET = container.withAuth(async (user, _request: Request) => container.authController.me(user));
