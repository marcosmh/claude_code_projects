import { useNavigate, useParams } from "react-router";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { PageSkeleton } from "@/components/common/Skeleton";
import { InvoiceForm } from "@/components/features/invoices/InvoiceForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useInvoice } from "@/hooks/useInvoice";
import { useInvoiceMutations } from "@/hooks/useInvoiceMutations";
import { ApiError } from "@/services/apiClient";
import { invoiceToFormValues } from "@/utils/invoiceForm";
import { NotFoundPage } from "./NotFoundPage";
import { parseId } from "./parseId";

export function EditInvoicePage() {
  const id = parseId(useParams().id);
  const navigate = useNavigate();
  const { data: invoice, error, isPending, refetch } = useInvoice(id);
  const { update } = useInvoiceMutations();
  useDocumentTitle(invoice ? `Editar ${invoice.number}` : "Editar factura");

  if (id === null || (error instanceof ApiError && error.status === 404)) return <NotFoundPage />;
  if (isPending) return <PageSkeleton rows={8} />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  return (
    <>
      <PageHeader
        title={`Editar ${invoice.number}`}
        trail={[
          { label: "Facturas", to: "/invoices" },
          { label: invoice.number, to: `/invoices/${invoice.id}` },
          { label: "Editar" },
        ]}
      />
      <InvoiceForm
        // `updatedAt` reinicia el formulario si los datos cambian (patrón de `key`).
        key={invoice.updatedAt}
        initial={invoiceToFormValues(invoice)}
        cancelTo={`/invoices/${invoice.id}`}
        onSubmit={async (input) => {
          await update.mutateAsync({ id: invoice.id, input });
          await navigate(`/invoices/${invoice.id}`);
        }}
      />
    </>
  );
}
