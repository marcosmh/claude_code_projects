import type { AdminRepository } from "@/repositories/admin-repository";
import type { AdminDashboardDto } from "@portal/shared-types";

/** Operaciones del panel de administración. La autorización (ADMIN) se aplica en la ruta. */
export function createAdminService(repository: AdminRepository) {
  return {
    getDashboard(): Promise<AdminDashboardDto> {
      return repository.countIndicators();
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
