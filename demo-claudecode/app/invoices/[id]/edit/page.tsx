import { notFound } from "next/navigation";
import { InvoiceForm } from "@/components/InvoiceForm";
import { updateInvoice } from "@/lib/actions/invoices";
import { toDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function EditInvoicePage({ params }: PageProps<"/invoices/[id]/edit">) {
  const { id } = await params;
  const invoice = Number.isInteger(Number(id))
    ? await prisma.invoice.findUnique({ where: { id: Number(id) }, include: { items: true } })
    : null;
  if (!invoice) notFound();

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Editar {invoice.number}</h1>
      <InvoiceForm
        action={updateInvoice.bind(null, invoice.id)}
        cancelHref={`/invoices/${invoice.id}`}
        initial={{
          clientName: invoice.clientName,
          clientEmail: invoice.clientEmail ?? "",
          clientAddress: invoice.clientAddress ?? "",
          issueDate: toDateInput(invoice.issueDate),
          dueDate: toDateInput(invoice.dueDate),
          status: invoice.status,
          taxRate: String(invoice.taxRate),
          notes: invoice.notes ?? "",
          items: invoice.items.map((i) => ({
            description: i.description,
            quantity: String(i.quantity),
            price: (i.unitPriceCents / 100).toFixed(2),
          })),
        }}
      />
    </>
  );
}
