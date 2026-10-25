import { prisma } from "../lib/prisma";
import { PrismaInvoiceRepository } from "./PrismaInvoiceRepository";

export type { InvoiceRepository } from "./InvoiceRepository";
export { PrismaInvoiceRepository } from "./PrismaInvoiceRepository";

export const invoiceRepository = new PrismaInvoiceRepository(prisma);
