import { container } from "@/container";

export const GET = container.withAuth((user, _request: Request) => container.statsController.summary(user.id));
