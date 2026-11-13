"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import {
  ApiRequestError,
  adminUsersUrl,
  buildAdminUsersUrl,
  fetchAdminUsers,
  updateAdminUser,
} from "@portal/api-client";
import type { AdminUserDto, AdminUserStatus, UpdateAdminUserInput } from "@portal/shared-types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Pagination } from "@/components/ui/Pagination";
import { useFlash } from "@/hooks/useFlash";
import { parsePageParam, useClampPage, useUrlQuery } from "@/hooks/useUrlQuery";
import { AdminPageHeader } from "./AdminPageHeader";

type RoleFilter = "" | "USER" | "ADMIN";

const statusOptions: { value: AdminUserStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Activas" },
  { value: "inactive", label: "Desactivadas" },
];

const dateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });

const focusClassName =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const controlClassName = `h-10 rounded-md border border-foreground/20 bg-surface px-3 text-sm text-foreground ${focusClassName}`;
const iconButtonClassName = `inline-flex size-9 items-center justify-center rounded-md border border-foreground/20 transition-colors hover:bg-foreground/5 disabled:opacity-40 ${focusClassName}`;
const secondaryButtonClassName = `inline-flex h-9 items-center rounded-md border border-foreground/20 px-3 text-sm font-semibold transition-colors hover:bg-foreground/5 disabled:opacity-50 ${focusClassName}`;
const iconProps = {
  "aria-hidden": true,
  viewBox: "0 0 24 24",
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

type PendingChange = { user: AdminUserDto; change: UpdateAdminUserInput };

function describeSuccess({ user, change }: PendingChange): string {
  if (change.isActive === false) return `Se desactivó a ${user.name}.`;
  if (change.isActive === true) return `Se activó a ${user.name}.`;
  return change.role === "ADMIN"
    ? `${user.name} ahora es administrador.`
    : `${user.name} ya no es administrador.`;
}

function describeChange({ user, change }: PendingChange) {
  if (change.isActive === false) {
    return {
      title: `¿Desactivar a ${user.name}?`,
      description: "No podrá iniciar sesión y su sesión actual dejará de ser válida.",
      confirmLabel: "Sí, desactivar",
    };
  }
  if (change.isActive === true) {
    return {
      title: `¿Activar a ${user.name}?`,
      description: "Podrá volver a iniciar sesión.",
      confirmLabel: "Sí, activar",
    };
  }
  return change.role === "ADMIN"
    ? {
        title: `¿Hacer administrador a ${user.name}?`,
        description: "Tendrá acceso completo al área de administración.",
        confirmLabel: "Sí, hacer administrador",
      }
    : {
        title: `¿Quitar el rol de administrador a ${user.name}?`,
        description: "Pasará a ser un usuario sin acceso a la administración.",
        confirmLabel: "Sí, quitar rol",
      };
}

/** Administración de usuarios: búsqueda, filtros, paginación, activar/desactivar y cambio de rol. */
export function AdminUsersList() {
  const { values, update } = useUrlQuery({ page: "1", search: "", role: "", status: "all" });
  const page = parsePageParam(values.page);
  const searchText = values.search;
  const role: RoleFilter = values.role === "USER" || values.role === "ADMIN" ? values.role : "";
  const status: AdminUserStatus = statusOptions.some((option) => option.value === values.status)
    ? (values.status as AdminUserStatus)
    : "all";
  const [searchInput, setSearchInput] = useState(searchText);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { user: currentUser } = useCurrentUser();
  const flash = useFlash();
  const { mutate: mutateMatching } = useSWRConfig();

  const { data, error, mutate, isValidating } = useSWR(
    buildAdminUsersUrl({ page, search: searchText, role: role || undefined, status }),
    fetchAdminUsers,
    { revalidateOnFocus: false, shouldRetryOnError: false, keepPreviousData: true },
  );
  const totalPages = data?.totalPages ?? 1;
  useClampPage(page, data?.totalPages, (lastPage) => update({ page: String(lastPage) }));

  async function confirmChange() {
    if (pending === null) return;
    setIsSaving(true);
    try {
      await updateAdminUser(pending.user.id, pending.change);
      // Revalida todas las páginas y filtros en caché de la lista.
      await mutateMatching((key) => typeof key === "string" && key.startsWith(adminUsersUrl));
      setActionError(null);
      flash.success(describeSuccess(pending));
    } catch (caught) {
      const message =
        caught instanceof ApiRequestError && caught.status < 500
          ? caught.message
          : "No pudimos actualizar al usuario. Inténtalo de nuevo.";
      setActionError(message);
      flash.error(message);
    } finally {
      setPending(null);
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <AdminPageHeader
        title="Administrar usuarios"
        description="Cuentas registradas: busca, activa o desactiva y cambia el rol."
        breadcrumbs={[{ label: "Administración", href: "/admin" }, { label: "Usuarios" }]}
        actions={
          <Link
            href="/admin/users/new"
            className={`inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 ${focusClassName}`}
          >
            Nuevo usuario
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <form
          role="search"
          className="flex min-w-0 flex-1 items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update({ page: "1", search: searchInput.trim() });
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-users-search" className="block text-sm font-medium">
              Buscar usuarios
            </label>
            <input
              id="admin-users-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nombre o email…"
              maxLength={100}
              className={`mt-1 w-full ${controlClassName}`}
            />
          </div>
          <button type="submit" className={`h-10 ${secondaryButtonClassName}`}>
            Buscar
          </button>
        </form>
        <div>
          <label htmlFor="admin-users-role" className="block text-sm font-medium">
            Rol
          </label>
          <select
            id="admin-users-role"
            value={role}
            onChange={(event) => {
              update({ page: "1", role: event.target.value });
            }}
            className={`mt-1 ${controlClassName}`}
          >
            <option value="">Todos</option>
            <option value="USER">Usuario</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>
        <div>
          <label htmlFor="admin-users-status" className="block text-sm font-medium">
            Cuenta
          </label>
          <select
            id="admin-users-status"
            value={status}
            onChange={(event) => {
              update({ page: "1", status: event.target.value });
            }}
            className={`mt-1 ${controlClassName}`}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm">
          {actionError}
        </p>
      )}

      <section
        aria-label="Listado de usuarios"
        className="mt-4 overflow-hidden rounded-xl border border-foreground/10 bg-surface shadow-sm"
      >
        {error ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"
          >
            <p>No pudimos cargar los usuarios. Revisa tu conexión y vuelve a intentarlo.</p>
            <button
              type="button"
              onClick={() => void mutate()}
              disabled={isValidating}
              className={secondaryButtonClassName}
            >
              {isValidating ? "Reintentando…" : "Reintentar"}
            </button>
          </div>
        ) : data === undefined ? (
          <p role="status" className="p-5 text-sm text-foreground/70">
            Cargando usuarios…
          </p>
        ) : data.items.length === 0 ? (
          <p className="p-5 text-sm text-foreground/70">
            No hay usuarios que coincidan con la búsqueda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <caption className="sr-only">Usuarios del portal</caption>
              <thead className="bg-foreground/[0.04] text-xs uppercase tracking-wide text-foreground/70">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Usuario
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Rol
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Cuenta
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Alta
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Consultas / favoritos
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {data.items.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  const nextRole = user.role === "ADMIN" ? "USER" : "ADMIN";
                  return (
                    <tr key={user.id}>
                      <th scope="row" className="max-w-64 px-5 py-3 font-medium">
                        <span className="block truncate" title={user.name}>
                          {user.name}
                          {isSelf && <span className="font-normal text-foreground/70"> (tú)</span>}
                        </span>
                        <span className="block truncate text-xs font-normal text-foreground/70">
                          {user.email}
                        </span>
                      </th>
                      <td className="px-5 py-3">
                        {user.role === "ADMIN" ? "Administrador" : "Usuario"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            user.isActive
                              ? "inline-flex rounded-full bg-success-surface px-2.5 py-0.5 text-xs font-semibold text-success"
                              : "inline-flex rounded-full bg-warning-surface px-2.5 py-0.5 text-xs font-semibold text-warning"
                          }
                        >
                          {user.isActive ? "Activa" : "Desactivada"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-foreground/70">
                        {dateFormatter.format(new Date(user.createdAt))}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        {user.inquiriesCount} / {user.favoritesCount}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isSelf}
                            aria-label={`${user.isActive ? "Desactivar" : "Activar"} a ${user.name}`}
                            title={
                              isSelf
                                ? "No puedes modificar tu propia cuenta"
                                : user.isActive
                                  ? "Desactivar"
                                  : "Activar"
                            }
                            onClick={() =>
                              setPending({ user, change: { isActive: !user.isActive } })
                            }
                            className={`${iconButtonClassName} ${user.isActive ? "text-danger" : ""}`}
                          >
                            <svg {...iconProps}>
                              {user.isActive ? (
                                <>
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="m5.6 5.6 12.8 12.8" />
                                </>
                              ) : (
                                <>
                                  <circle cx="12" cy="12" r="9" />
                                  <path d="m8 12 3 3 5-6" />
                                </>
                              )}
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            aria-label={
                              nextRole === "ADMIN"
                                ? `Hacer administrador a ${user.name}`
                                : `Quitar rol de administrador a ${user.name}`
                            }
                            title={
                              isSelf
                                ? "No puedes cambiar tu propio rol"
                                : nextRole === "ADMIN"
                                  ? "Hacer administrador"
                                  : "Quitar rol de administrador"
                            }
                            onClick={() => setPending({ user, change: { role: nextRole } })}
                            className={iconButtonClassName}
                          >
                            <svg
                              {...iconProps}
                              fill={user.role === "ADMIN" ? "currentColor" : "none"}
                            >
                              <path d="M12 3 4 6v6c0 4.5 3.2 7.8 8 9 4.8-1.2 8-4.5 8-9V6Z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Pagination
        page={page}
        totalPages={totalPages}
        label="Paginación"
        onPageChange={(targetPage) => update({ page: String(targetPage) })}
      />

      {pending && (
        <ConfirmDialog
          {...describeChange(pending)}
          cancelLabel="No, cancelar"
          isBusy={isSaving}
          onConfirm={() => void confirmChange()}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
