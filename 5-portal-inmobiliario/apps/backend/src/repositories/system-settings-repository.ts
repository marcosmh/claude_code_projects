import "server-only";
import { database } from "@/lib/database/client";
import type { SystemSettingsDto } from "@portal/shared-types";

export type SystemSettingsRepository = {
  /** Configuración actual; la primera vez crea la fila con los valores por defecto. */
  get(): Promise<SystemSettingsDto>;
  update(settings: SystemSettingsDto): Promise<SystemSettingsDto>;
};

const GLOBAL_ID = "global";

const select = {
  allowRegistration: true,
  defaultCurrency: true,
  contactEmail: true,
  contactPhone: true,
} as const;

export const systemSettingsRepository: SystemSettingsRepository = {
  get() {
    return database.systemSettings.upsert({
      where: { id: GLOBAL_ID },
      update: {},
      create: { id: GLOBAL_ID },
      select,
    });
  },

  update(settings) {
    return database.systemSettings.upsert({
      where: { id: GLOBAL_ID },
      update: settings,
      create: { id: GLOBAL_ID, ...settings },
      select,
    });
  },
};
