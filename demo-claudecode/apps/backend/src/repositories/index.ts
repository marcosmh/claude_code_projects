import { prisma } from "../lib/prisma";
import { PrismaAuditRepository } from "./PrismaAuditRepository";
import { PrismaAuthRepository } from "./PrismaAuthRepository";
import { PrismaInvoiceRepository } from "./PrismaInvoiceRepository";

export type { AuditRepository } from "./AuditRepository";
export type { AuthRepository } from "./AuthRepository";
export type { InvoiceRepository } from "./InvoiceRepository";
export { PrismaAuditRepository } from "./PrismaAuditRepository";
export { PrismaAuthRepository } from "./PrismaAuthRepository";
export { PrismaInvoiceRepository } from "./PrismaInvoiceRepository";

export const invoiceRepository = new PrismaInvoiceRepository(prisma);
export const authRepository = new PrismaAuthRepository(prisma);
export const auditRepository = new PrismaAuditRepository(prisma);
