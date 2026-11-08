import Link from "next/link";

const actionLinkClassName =
  "inline-flex h-12 items-center rounded-md px-6 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function CallToActionSection() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-blue-600 p-8 text-white">
          <h2 id="cta-title" className="text-2xl font-bold">
            Explora todo el catálogo
          </h2>
          <p className="mt-2 text-white/85">
            Filtra por precio, tipo de propiedad y ubicación para encontrar lo
            que buscas.
          </p>
          <Link href="/properties" className={`${actionLinkClassName} mt-6 bg-white text-blue-700 hover:bg-white/90`}>
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
