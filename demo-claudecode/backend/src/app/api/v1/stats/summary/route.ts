import { container } from "@/container";
import { withErrorHandler } from "@/middleware/withErrorHandler";

export const GET = withErrorHandler(() => container.statsController.summary());
