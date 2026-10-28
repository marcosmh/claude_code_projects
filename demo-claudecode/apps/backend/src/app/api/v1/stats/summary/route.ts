import { container } from "@/container";

export const GET = container.withAuth((user, request: Request) => container.statsController.summary(user.id, request));
