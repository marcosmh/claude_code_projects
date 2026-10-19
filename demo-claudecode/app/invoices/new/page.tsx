import { connection } from "next/server";
import { InvoiceForm } from "@/components/InvoiceForm";
import { createInvoice } from "@/lib/actions/invoices";
import { toDateInput } from "@/lib/format";

export default async function NewInvoicePage() {
  await connection();
  const today = new Date();
  const due = new Date(today.getTime() + 30 * 86400000);
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Nueva factura</h1>
      <InvoiceForm
        action={createInvoice}
        cancelHref="/invoices"
        initial={{
          clientName: "",
          clientEmail: "",
          clientAddress: "",
          issueDate: toDateInput(today),
          dueDate: toDateInput(due),
          status: "DRAFT",
          taxRate: "0",
          notes: "",
          items: [{ description: "", quantity: "1", price: "" }],
        }}
      />
    </>
  );
}
