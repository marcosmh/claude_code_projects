import { Link } from "react-router";
import { button } from "@/components/common/ui";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("No encontrada");
  return (
    <div className="py-16">
      <h1 className="text-3xl">No encontramos esa página</h1>
      <p className="mt-2 max-w-prose text-zinc-600">La factura o la dirección que buscas no existe, o ya fue eliminada.</p>
      <Link to="/invoices" className={`${button("primary")} mt-6`}>
        Ir a las facturas
      </Link>
    </div>
  );
}
