"use client";

import { button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="py-16">
      <h1 className="text-3xl">No se pudo cargar la página</h1>
      <p className="mt-2 max-w-prose text-zinc-600">
        Ocurrió un error al leer los datos. Vuelve a intentarlo; si sigue fallando, recarga la página.
      </p>
      <button type="button" onClick={reset} className={`${button("primary")} mt-6`}>
        Reintentar
      </button>
    </div>
  );
}
