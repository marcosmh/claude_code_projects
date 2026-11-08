import Link from "next/link";

const actionLinkClassName =
  "inline-flex h-12 items-center rounded-md px-6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function CallToActionSection() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-primary p-8 text-primary-foreground">
          <h2 id="cta-title" className="text-2xl font-bold">
            Explora todo el catálogo
          </h2>
          <p className="mt-2 text-primary-foreground">
            Filtra por precio, tipo de propiedad y ubicación para encontrar lo
            que buscas.
          </p>
          <Link href="/properties" className={`${actionLinkClassName} mt-6 bg-primary-foreground text-primary hover:opacity-90`}>
            Ver propiedades
          </Link>
        </div>
        <div className="rounded-2xl border border-foreground/15 p-8">
          <h2 className="text-2xl font-bold">Guarda tus favoritas</h2>
          <p className="mt-2 text-foreground/70">
            Inicia sesión para guardar propiedades y revisar tus consultas en
            cualquier momento.
          </p>
          <Link href="/login" className={`${actionLinkClassName} mt-6 bg-foreground text-background hover:opacity-90`}>
            Ingresar
          </Link>
        </div>
      </div>
    </section>
  );
}
