import type { SystemSettingsRepository } from "@/repositories/system-settings-repository";
import type { SystemSettingsDto } from "@portal/shared-types";

/** Configuración del sistema (spec §59). La autorización (ADMIN) se aplica en la ruta. */
export function createSystemSettingsService(repository: SystemSettingsRepository) {
  return {
    getSettings(): Promise<SystemSettingsDto> {
      return repository.get();
    },

    updateSettings(settings: SystemSettingsDto): Promise<SystemSettingsDto> {
      return repository.update(settings);
    },

    async isRegistrationOpen(): Promise<boolean> {
      return (await repository.get()).allowRegistration;
    },
  };
}

export type SystemSettingsService = ReturnType<typeof createSystemSettingsService>;
