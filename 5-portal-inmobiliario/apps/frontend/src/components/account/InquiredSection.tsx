"use client";

import Image from "next/image";
import { imageLoaderFor } from "@/lib/image-loader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useUserInquiries } from "@/hooks/useUserInquiries";
import { parsePageParam, useClampPage, useUrlQuery } from "@/hooks/useUrlQuery";

const SEARCH_DELAY_MS = 300;
const pageButtonClassName =
  "rounded-md border border-foreground/20 px-4 py-2 text-sm font-semibold hover:bg-foreground/5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const dateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

/** «Propiedades consultadas»: lista compacta de las consultas enviadas, con opción de eliminar. */
export function InquiredSection() {
  // Parámetros con prefijo: la página de la cuenta tiene otras secciones.
  const { values, update } = useUrlQuery({ inquiriesPage: "1", inquiriesSearch: "" });
  const page = parsePageParam(values.inquiriesPage);
  const searchText = values.inquiriesSearch;
  const [searchInput, setSearchInput] = useState(searchText);
  const { inquiries, totalPages: loadedTotalPages, remove } = useUserInquiries({ page, searchText });
  const totalPages = loadedTotalPages ?? 1;
  useClampPage(page, loadedTotalPages, (lastPage) => update({ inquiriesPage: String(lastPage) }));
  const [pendingDeletion, setPendingDeletion] = useState<{ id: string; title: string } | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // La búsqueda espera a que la persona deje de escribir y vuelve a la primera página.
  useEffect(() => {
    const trimmedSearch = searchInput.trim();
    if (trimmedSearch === searchText) return;
    const timer = setTimeout(() => {
      update({ inquiriesPage: "1", inquiriesSearch: trimmedSearch });
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
    // `update` cambia con la URL; solo reacciona a lo que se escribe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  async function confirmDeletion() {
    if (!pendingDeletion) return;
    const inquiryId = pendingDeletion.id;
    setDeletingId(inquiryId);
    setErrorMessage(null);
    try {
      await remove(inquiryId);
      // Si la página queda vacía, se retrocede a la anterior.
      if (inquiries?.length === 1 && page > 1) update({ inquiriesPage: String(page - 1) });
    } catch {
      setErrorMessage("No se pudo eliminar la consulta. Inténtalo de nuevo.");
    } finally {
      setDeletingId(null);
      setPendingDeletion(null);
    }
  }

  return (
    <section
      aria-labelledby="account-inquiries-title"
      className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm"
    >
      <h2 id="account-inquiries-title" className="text-lg font-semibold">
        Propiedades consultadas
      </h2>
      <div className="mt-3">
        <label htmlFor="inquiries-search" className="sr-only">
          Buscar en tus consultas por título o mensaje
        </label>
        <input
          id="inquiries-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Buscar por título o mensaje…"
          autoComplete="off"
          maxLength={100}
          className="w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </div>
      {errorMessage && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {errorMessage}
        </p>
      )}
      {inquiries === undefined ? (
        <p role="status" className="mt-2 text-foreground/70">
          Cargando tus consultas…
        </p>
      ) : inquiries.length === 0 && searchText !== "" ? (
        <p role="status" className="mt-3 text-foreground/70">
          No hay consultas que coincidan con «{searchText}».
        </p>
      ) : inquiries.length === 0 ? (
        <>
          <p className="mt-2 text-foreground/70">Aún no has consultado ninguna propiedad.</p>
          <Link
            href="/properties"
            className="mt-3 inline-block text-sm font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Explorar propiedades
          </Link>
        </>
      ) : (
        <ul className="mt-4 divide-y divide-foreground/10">
          {inquiries.map((inquiry) => (
            <li key={inquiry.id} className="flex items-start gap-3 py-3">
              <Link
                href={`/properties/${inquiry.propertyId}`}
                aria-label={`Ver ${inquiry.propertyTitle}`}
                className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-md bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {inquiry.propertyImageUrl && (
                  <Image
                    src={inquiry.propertyImageUrl}
                    loader={imageLoaderFor(inquiry.propertyImageUrl)}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold">
                  <Link
                    href={`/properties/${inquiry.propertyId}`}
                    className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {inquiry.propertyTitle}
                  </Link>
                </h3>
                <p className="truncate text-xs text-foreground/70">
                  <span className="font-medium">Asunto:</span> {inquiry.subject}
                </p>
                <p className="line-clamp-2 text-sm text-foreground/80">{inquiry.message}</p>
                <p className="mt-0.5 text-xs text-foreground/60">
                  {dateFormatter.format(new Date(inquiry.createdAt))}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingDeletion({ id: inquiry.id, title: inquiry.propertyTitle })}
                disabled={deletingId === inquiry.id}
                aria-label={`Eliminar consulta sobre ${inquiry.propertyTitle}`}
                title="Eliminar consulta"
                className="shrink-0 rounded-md p-2 text-foreground/60 hover:bg-danger/10 hover:text-danger disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18" />
                  <path d="M8 6V4h8v2" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <nav
          aria-label="Paginación de consultas"
          className="mt-4 flex items-center justify-between gap-4"
        >
          <button
            type="button"
            onClick={() => update({ inquiriesPage: String(page - 1) })}
            disabled={page <= 1}
            className={pageButtonClassName}
          >
            ← Anterior
          </button>
          <p className="text-sm text-foreground/70" aria-live="polite">
            Página {page} de {totalPages}
          </p>
          <button
            type="button"
            onClick={() => update({ inquiriesPage: String(page + 1) })}
            disabled={page >= totalPages}
            className={pageButtonClassName}
          >
            Siguiente →
          </button>
        </nav>
      )}
      {pendingDeletion && (
        <ConfirmDialog
          title="¿Deseas eliminar esta consulta?"
          description={`Se eliminará tu consulta sobre «${pendingDeletion.title}». Esta acción no se puede deshacer.`}
          confirmLabel="Sí, eliminar"
          cancelLabel="No, cancelar"
          isBusy={deletingId !== null}
          onConfirm={() => void confirmDeletion()}
          onCancel={() => setPendingDeletion(null)}
        />
      )}
    </section>
  );
}
