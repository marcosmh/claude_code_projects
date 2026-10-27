import Link from "next/link";
import { button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="text-3xl">No encontramos esa página</h1>
      <p className="mt-2 max-w-prose text-zinc-600">
        La factura o la dirección que buscas no existe, o ya fue eliminada.
      </p>
      <Link href="/invoices" className={`${button("primary")} mt-6`}>
        Ir a las facturas
      </Link>
    </div>
  );
}
