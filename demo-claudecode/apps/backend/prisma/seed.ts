import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPrismaClient } from "../src/lib/prisma";

// Safety: never run in production, and require --force because it wipes all invoices.
if (process.env.NODE_ENV === "production") {
  throw new Error("Seed is disabled when NODE_ENV=production");
}
if (!process.argv.includes("--force")) {
  throw new Error("Seed deletes ALL invoices. Re-run with --force: npm run db:seed -- --force");
}

// Safety: the seed deletes invoices, so it refuses to run unless SEED_ALLOW_HOST names the database host
// (e.g. SEED_ALLOW_HOST=localhost). Prevents wiping a shared/remote database by accident.
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const host = new URL(url).hostname;
if (process.env.SEED_ALLOW_HOST !== host) {
  throw new Error(`Seed deletes ALL invoices in ${host}. Re-run with SEED_ALLOW_HOST=${host} to confirm.`);
}

const prisma = createPrismaClient(url);

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
  // Seeded invoices go to the first user, if any; otherwise they stay unowned until user:create claims them.
  const owner = await prisma.user.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  await prisma.invoice.deleteMany();
  // Reset the id sequences so ids (and numbers) start at 1 again.
  await prisma.$executeRaw`ALTER SEQUENCE "Invoice_id_seq" RESTART WITH 1`;
  await prisma.$executeRaw`ALTER SEQUENCE "InvoiceItem_id_seq" RESTART WITH 1`;
  for (const [i, inv] of invoices.entries()) {
    await prisma.invoice.create({
      data: {
        ...inv,
        ownerId: owner?.id ?? null,
        number: `FAC-${String(i + 1).padStart(4, "0")}`,
        issueDate: new Date(inv.issueDate),
        dueDate: new Date(inv.dueDate),
        items: { create: inv.items },
      },
    });
  }
  console.log(`Seeded ${invoices.length} invoices${owner ? ` for user ${owner.id}` : " (no users yet: run npm run user:create)"}`);
}

main().finally(() => prisma.$disconnect());
