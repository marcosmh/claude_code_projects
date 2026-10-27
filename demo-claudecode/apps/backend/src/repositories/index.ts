import { prisma } from "../lib/prisma";
import { PrismaAuthRepository } from "./PrismaAuthRepository";
import { PrismaInvoiceRepository } from "./PrismaInvoiceRepository";

export type { AuthRepository } from "./AuthRepository";
export type { InvoiceRepository } from "./InvoiceRepository";
export { PrismaAuthRepository } from "./PrismaAuthRepository";
export { PrismaInvoiceRepository } from "./PrismaInvoiceRepository";

export const invoiceRepository = new PrismaInvoiceRepository(prisma);
export const authRepository = new PrismaAuthRepository(prisma);
