"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRole } from "@portal/shared-types";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const roleLabels: Record<UserRole, string> = { USER: "Usuario", ADMIN: "Administrador" };

const linkClassName =
  "font-semibold text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function AccountSection({
  id,
  title,
  emptyMessage,
}: {
  id: string;
  title: string;
  emptyMessage: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm"
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-foreground/70">{emptyMessage}</p>
      <Link href="/properties" className={`${linkClassName} mt-3 inline-block text-sm`}>
        Explorar propiedades
      </Link>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-foreground/70">{label}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}

/** Área privada del usuario: datos básicos y secciones de propiedades interesadas y consultadas. */
export function AccountOverview() {
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
        <Link href="/login?next=%2Faccount" className={linkClassName}>
          Inicia sesión de nuevo
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>

      <section
        aria-labelledby="account-info-title"
        className="rounded-xl border border-foreground/10 bg-surface p-6 shadow-sm"
      >
        <h2 id="account-info-title" className="text-lg font-semibold">
          Información básica
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Nombre">{user.name}</Field>
          <Field label="Email">{user.email}</Field>
          <Field label="Rol">{roleLabels[user.role]}</Field>
        </dl>
        <Link
          href="/account/edit"
          className="mt-5 inline-flex h-11 items-center rounded-md border border-foreground/20 px-5 text-sm font-semibold hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Editar datos
        </Link>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <AccountSection
          id="account-interested-title"
          title="Propiedades interesadas"
          emptyMessage="Aún no tienes propiedades guardadas."
        />
        <AccountSection
          id="account-inquiries-title"
          title="Propiedades consultadas"
          emptyMessage="Aún no has consultado ninguna propiedad."
        />
      </div>
    </div>
  );
}
