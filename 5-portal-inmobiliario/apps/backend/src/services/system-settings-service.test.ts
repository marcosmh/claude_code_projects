import { describe, expect, it, vi } from "vitest";
import type { SystemSettingsDto } from "@portal/shared-types";
import { createSystemSettingsService } from "./system-settings-service";

const settings: SystemSettingsDto = {
  allowRegistration: true,
  defaultCurrency: "MXN",
  contactEmail: null,
  contactPhone: null,
};

describe("createSystemSettingsService", () => {
  it("lee y guarda la configuración a través del repositorio", async () => {
    const saved = { ...settings, defaultCurrency: "USD" as const };
    const repository = {
      get: vi.fn().mockResolvedValue(settings),
      update: vi.fn().mockResolvedValue(saved),
    };
    const service = createSystemSettingsService(repository);

    await expect(service.getSettings()).resolves.toEqual(settings);
    await expect(service.updateSettings(saved)).resolves.toEqual(saved);
    expect(repository.update).toHaveBeenCalledWith(saved);
  });

  it("isRegistrationOpen refleja el ajuste vigente", async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(settings)
      .mockResolvedValueOnce({ ...settings, allowRegistration: false });
    const service = createSystemSettingsService({ get, update: vi.fn() });

    await expect(service.isRegistrationOpen()).resolves.toBe(true);
    await expect(service.isRegistrationOpen()).resolves.toBe(false);
  });
});
