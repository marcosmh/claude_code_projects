import { container } from "@/container";
import { withErrorHandler } from "@/middleware/withErrorHandler";

export const POST = withErrorHandler((request: Request) => container.authController.login(request));
