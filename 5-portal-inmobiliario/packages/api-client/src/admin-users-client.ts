import type {
  AdminUserDto,
  AdminUserStatus,
  CreateAdminUserInput,
  PaginatedResponse,
  UpdateAdminUserInput,
  UserRole,
} from "@portal/shared-types";
import { ApiRequestError } from "./properties-client";

export const adminUsersUrl = "/api/admin/users";

export type AdminUsersQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  status?: AdminUserStatus;
};

/** URL de la lista de usuarios; sirve también como clave de caché de SWR. */
export function buildAdminUsersUrl({
  page = 1,
  pageSize,
  search,
  role,
  status = "all",
}: AdminUsersQuery = {}): string {
  const params = new URLSearchParams({ page: String(page) });
  if (pageSize !== undefined) params.set("pageSize", String(pageSize));
  if (search && search.trim() !== "") params.set("search", search.trim());
  if (role) params.set("role", role);
  if (status !== "all") params.set("status", status);
  return `${adminUsersUrl}?${params.toString()}`;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    return typeof body.message === "string" && body.message !== "" ? body.message : fallback;
  } catch {
    return fallback;
  }
}

async function send<TResult>(
  url: string,
  init: { method: string; body?: unknown },
  fallbackMessage: string,
): Promise<TResult> {
  const response = await fetch(url, {
    method: init.method,
    headers: {
      Accept: "application/json",
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
    },
    ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
  });
  if (!response.ok) {
    throw new ApiRequestError(await readErrorMessage(response, fallbackMessage), response.status);
  }
  return (await response.json()) as TResult;
}

/** Lista paginada de usuarios (requiere ADMIN). */
export function fetchAdminUsers(
  url: string = buildAdminUsersUrl(),
): Promise<PaginatedResponse<AdminUserDto>> {
  return send(url, { method: "GET" }, "No se pudieron cargar los usuarios");
}

export function fetchAdminUser(userId: string): Promise<AdminUserDto> {
  return send(
    `${adminUsersUrl}/${encodeURIComponent(userId)}`,
    { method: "GET" },
    "No se pudo cargar el usuario",
  );
}

/** Activa o desactiva la cuenta y/o cambia el rol. */
export function updateAdminUser(
  userId: string,
  input: UpdateAdminUserInput,
): Promise<AdminUserDto> {
  return send(
    `${adminUsersUrl}/${encodeURIComponent(userId)}`,
    { method: "PATCH", body: input },
    "No se pudo actualizar el usuario",
  );
}

/** Da de alta una cuenta (USER o ADMIN); 409 si el email ya existe. */
export function createAdminUser(input: CreateAdminUserInput): Promise<AdminUserDto> {
  return send(adminUsersUrl, { method: "POST", body: input }, "No se pudo crear el usuario");
}
