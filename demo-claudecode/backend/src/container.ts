import { AuthController } from "./controllers/AuthController";
import { InvoiceController } from "./controllers/InvoiceController";
import { StatsController } from "./controllers/StatsController";
import { createWithAuth } from "./middleware/withAuth";
import { authRepository, invoiceRepository } from "./repositories";
import type { AuthRepository } from "./repositories/AuthRepository";
import type { InvoiceRepository } from "./repositories/InvoiceRepository";
import { AuthService } from "./services/AuthService";
import { InvoicePdfService } from "./services/InvoicePdfService";
import { InvoiceService } from "./services/InvoiceService";
import { StatsService } from "./services/StatsService";

/** Composition root: wires Repository -> Service -> Controller. */
export function createContainer(
  repository: InvoiceRepository,
  auth: AuthRepository,
  now: () => Date = () => new Date(),
) {
  const invoiceService = new InvoiceService(repository, now);
  const authService = new AuthService(auth, now);
  return {
    authService,
    authController: new AuthController(authService),
    invoiceController: new InvoiceController(invoiceService, new InvoicePdfService(invoiceService)),
    statsController: new StatsController(new StatsService(repository, now)),
    withAuth: createWithAuth((token) => authService.authenticate(token)),
  };
}

export const container = createContainer(invoiceRepository, authRepository);
