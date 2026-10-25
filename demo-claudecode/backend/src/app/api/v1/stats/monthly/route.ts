import { container } from "@/container";
import { withErrorHandler } from "@/middleware/withErrorHandler";

export const GET = withErrorHandler((request: Request) => container.statsController.monthly(request));
