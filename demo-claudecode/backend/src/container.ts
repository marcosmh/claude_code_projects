import { InvoiceController } from "./controllers/InvoiceController";
import { StatsController } from "./controllers/StatsController";
import { invoiceRepository } from "./repositories";
import type { InvoiceRepository } from "./repositories/InvoiceRepository";
import { InvoicePdfService } from "./services/InvoicePdfService";
import { InvoiceService } from "./services/InvoiceService";
import { StatsService } from "./services/StatsService";

/** Composition root: wires Repository -> Service -> Controller. */
export function createContainer(repository: InvoiceRepository, now: () => Date = () => new Date()) {
  const invoiceService = new InvoiceService(repository, now);
  return {
    invoiceController: new InvoiceController(invoiceService, new InvoicePdfService(invoiceService)),
    statsController: new StatsController(new StatsService(repository, now)),
  };
}

export const container = createContainer(invoiceRepository);
