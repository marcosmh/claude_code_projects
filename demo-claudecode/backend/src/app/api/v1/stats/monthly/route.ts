import { container } from "@/container";

export const GET = container.withAuth((user, request: Request) => container.statsController.monthly(user.id, request));
