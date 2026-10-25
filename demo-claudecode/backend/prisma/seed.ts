import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

// Safety: the seed deletes invoices, so it only runs against backend/prisma/dev.db.
const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const expected = resolve(process.cwd(), "prisma/dev.db");
if (resolve(process.cwd(), url.replace(/^file:/, "")) !== expected) {
  throw new Error(`Seed only targets ${expected}, got DATABASE_URL=${url}`);
}

const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

interface SeedInvoice {
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  issueDate: string;
  dueDate: string;
  status: string;
  taxRate: number;
  notes: string | null;
  items: { description: string; quantity: number; unitPriceCents: number }[];
}

async function main() {
  const invoices: SeedInvoice[] = JSON.parse(
    readFileSync(resolve(__dirname, "invoices.json"), "utf8"),
  );
  await prisma.invoice.deleteMany();
  // Reset autoincrement so ids (and numbers) start at 1 again.
  await prisma.$executeRaw`DELETE FROM sqlite_sequence WHERE name IN ('Invoice', 'InvoiceItem')`;
  for (const [i, inv] of invoices.entries()) {
    await prisma.invoice.create({
      data: {
        ...inv,
        number: `FAC-${String(i + 1).padStart(4, "0")}`,
        issueDate: new Date(inv.issueDate),
        dueDate: new Date(inv.dueDate),
        items: { create: inv.items },
      },
    });
  }
  console.log(`Seeded ${invoices.length} invoices`);
}

main().finally(() => prisma.$disconnect());
