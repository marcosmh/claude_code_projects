import { useNavigate } from "react-router";
import { InvoiceForm } from "@/components/features/invoices/InvoiceForm";
import { PageHeader } from "@/components/common/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useInvoiceMutations } from "@/hooks/useInvoiceMutations";
import { emptyInvoiceForm } from "@/utils/invoiceForm";

export function NewInvoicePage() {
  useDocumentTitle("Nueva factura");
  const navigate = useNavigate();
  const { create } = useInvoiceMutations();

  return (
    <>
      <PageHeader title="Nueva factura" trail={[{ label: "Facturas", to: "/invoices" }, { label: "Nueva" }]} />
      <InvoiceForm
        initial={emptyInvoiceForm()}
        cancelTo="/invoices"
        onSubmit={async (input) => {
          const invoice = await create.mutateAsync(input);
          await navigate(`/invoices/${invoice.id}`);
        }}
      />
    </>
  );
}
