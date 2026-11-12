"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSWRConfig } from "swr";
import { ApiRequestError, adminUsersUrl, createAdminUser } from "@portal/api-client";
import {
  adminUserFormSchema,
  type AdminUserFormData,
  type AdminUserFormValues,
} from "@/schemas/admin-user-form";
import { AdminPageHeader } from "./AdminPageHeader";
import { SelectField, TextField } from "./property-form-fields";

const roleOptions = [
  { value: "USER", label: "Usuario" },
  { value: "ADMIN", label: "Administrador" },
];

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Alta de una cuenta por un administrador: usuario normal o administrador. */
export function AdminUserForm() {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminUserFormValues, unknown, AdminUserFormData>({
    resolver: zodResolver(adminUserFormSchema),
    defaultValues: { name: "", email: "", password: "", role: "USER" },
  });

  const saveUser = async (data: AdminUserFormData) => {
    setSubmissionError(null);
    try {
      await createAdminUser(data);
    } catch (error) {
      setSubmissionError(
        error instanceof ApiRequestError && error.status < 500
          ? error.message
          : "No pudimos crear el usuario. Inténtalo de nuevo.",
      );
      return;
    }
    // El listado (y sus páginas en caché) debe mostrar la cuenta nueva.
    await mutate((key) => typeof key === "string" && key.startsWith(adminUsersUrl));
    router.push("/admin/users");
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <AdminPageHeader
        title="Nuevo usuario"
        description="Crea una cuenta activa, de usuario o de administración."
        breadcrumbs={[
          { label: "Administración", href: "/admin" },
          { label: "Usuarios", href: "/admin/users" },
          { label: "Nuevo usuario" },
        ]}
      />
      <form
        onSubmit={handleSubmit(saveUser)}
        noValidate
        aria-label="Nuevo usuario"
        className="mt-6 space-y-4 rounded-xl border border-foreground/10 bg-surface p-5 shadow-sm"
      >
        <TextField
          id="user-name"
          label="Nombre"
          autoComplete="off"
          maxLength={100}
          errorMessage={errors.name?.message}
          {...register("name")}
        />
        <TextField
          id="user-email"
          label="Email"
          type="email"
          autoComplete="off"
          errorMessage={errors.email?.message}
          {...register("email")}
        />
        <TextField
          id="user-password"
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          maxLength={128}
          hint="Mínimo 8 caracteres. Compártela con la persona por un medio seguro."
          errorMessage={errors.password?.message}
          {...register("password")}
        />
        <SelectField
          id="user-role"
          label="Rol"
          options={roleOptions}
          hint="Un administrador tiene acceso completo al área de administración."
          errorMessage={errors.role?.message}
          {...register("role")}
        />

        {submissionError && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
            {submissionError}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Link
            href="/admin/users"
            className={`inline-flex h-11 items-center rounded-md border border-foreground/20 px-4 text-sm font-semibold hover:bg-foreground/5 ${focusClassName}`}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-60 ${focusClassName}`}
          >
            {isSubmitting ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}
