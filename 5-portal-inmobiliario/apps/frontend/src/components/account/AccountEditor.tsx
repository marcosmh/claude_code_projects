"use client";

import Link from "next/link";
import { ProfileForm } from "@/components/account/ProfileForm";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const linkClassName =
  "font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Página de edición de la cuenta: título, enlace de regreso y el formulario precargado. */
export function AccountEditor() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div aria-busy="true" className="mx-auto h-64 w-full max-w-3xl rounded-xl bg-foreground/5">
        <span className="sr-only">Cargando tu cuenta…</span>
      </div>
    );
  }

  // El proxy ya exige sesión; esto cubre una sesión que expira con la página abierta.
  if (!user) {
    return (
      <p role="status" className="mx-auto max-w-3xl">
        Tu sesión terminó.{" "}
        <Link href="/login?next=%2Faccount%2Fedit" className={linkClassName}>
          Inicia sesión de nuevo
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div>
        <Link href="/account" className={`${linkClassName} text-sm`}>
          ← Volver a mi cuenta
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Editar mi cuenta</h1>
      </div>
      <ProfileForm user={user} />
    </div>
  );
}
