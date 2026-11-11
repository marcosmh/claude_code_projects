"use client";

import Link from "next/link";
import useSWR from "swr";
import { ApiRequestError, fetchAdminProperty } from "@portal/api-client";
import { AdminPageHeader } from "./AdminPageHeader";
import { PropertyForm } from "./PropertyForm";

type AdminPropertyEditorProps = {
  /** Id de la propiedad a editar; sin id es la página de creación. */
  propertyId?: string;
};

const backLinkClassName =
  "font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Página de creación o edición de una propiedad; la edición carga la propiedad (cualquier estado). */
export function AdminPropertyEditor({ propertyId }: AdminPropertyEditorProps) {
  const isEditing = propertyId !== undefined;
  const { data, error } = useSWR(
    isEditing ? ["admin-property", propertyId] : null,
    () => fetchAdminProperty(propertyId as string),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const title = isEditing ? "Editar propiedad" : "Nueva propiedad";
  const isNotFound = error instanceof ApiRequestError && error.status === 404;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <AdminPageHeader
        title={title}
        description={data?.title}
        breadcrumbs={[
          { label: "Administración", href: "/admin" },
          { label: "Propiedades", href: "/admin/properties" },
          { label: title },
        ]}
      />
      <div className="mt-6">
        {error ? (
          <p role="alert" className="text-sm">
            {isNotFound
              ? "No encontramos esta propiedad. Puede haber sido eliminada."
              : "No pudimos cargar la propiedad. Inténtalo de nuevo."}{" "}
            <Link href="/admin/properties" className={backLinkClassName}>
              Volver al listado
            </Link>
          </p>
        ) : isEditing && data === undefined ? (
          <p role="status" className="text-sm text-foreground/70">
            Cargando propiedad…
          </p>
        ) : (
          <PropertyForm key={data?.id ?? "new"} property={data} />
        )}
      </div>
    </div>
  );
}
