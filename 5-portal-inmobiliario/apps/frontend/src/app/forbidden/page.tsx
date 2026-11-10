import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acceso restringido | Portal Inmobiliario",
  robots: { index: false },
};

export default function ForbiddenPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-16 focus:outline-none sm:px-6">
      <section
        aria-labelledby="forbidden-title"
        className="mx-auto max-w-md rounded-xl border border-foreground/10 bg-surface p-8 text-center shadow-sm"
      >
        <h1 id="forbidden-title" className="text-2xl font-bold tracking-tight">
          Acceso restringido
        </h1>
        <p className="mt-2 text-foreground/70">Tu cuenta no tiene permiso para ver esta página.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
