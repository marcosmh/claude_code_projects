import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
});

const samples = [
  {
    clientName: "Acme Corp",
    clientEmail: "billing@acme.test",
    status: "PAID",
    taxRate: 21,
    items: [
      { description: "Diseño de logotipo", quantity: 1, unitPriceCents: 120000 },
      { description: "Manual de marca", quantity: 1, unitPriceCents: 45000 },
    ],
  },
  {
    clientName: "Globex SA",
    clientEmail: "ap@globex.test",
    status: "SENT",
    taxRate: 10,
    items: [{ description: "Consultoría (horas)", quantity: 12.5, unitPriceCents: 6000 }],
  },
  {
    clientName: "Initech",
    status: "DRAFT",
    taxRate: 0,
    items: [{ description: "Licencia anual", quantity: 3, unitPriceCents: 9900 }],
  },
];

async function main() {
  await prisma.invoice.deleteMany();
  for (const [i, s] of samples.entries()) {
    const issue = new Date(Date.UTC(2026, 8, 1 + i * 7));
    const created = await prisma.invoice.create({
      data: {
        number: `tmp-${i}`,
        clientName: s.clientName,
        clientEmail: s.clientEmail,
        status: s.status,
        taxRate: s.taxRate,
        issueDate: issue,
        dueDate: new Date(issue.getTime() + 30 * 86400000),
        items: { create: s.items },
      },
    });
    await prisma.invoice.update({
      where: { id: created.id },
      data: { number: `FAC-${String(created.id).padStart(4, "0")}` },
    });
  }
}

main().finally(() => prisma.$disconnect());
