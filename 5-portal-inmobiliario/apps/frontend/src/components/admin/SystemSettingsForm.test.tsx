// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useFlashStore } from "@/stores/flashStore";

const swr = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  mutate: vi.fn(),
  isValidating: false,
  mutateMatching: vi.fn(),
}));
vi.mock("swr", () => ({
  default: () => swr,
  useSWRConfig: () => ({ mutate: swr.mutateMatching }),
}));

const api = vi.hoisted(() => ({ updateAdminSettings: vi.fn() }));
vi.mock("@portal/api-client", () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return {
    ApiRequestError,
    adminSettingsUrl: "/api/admin/settings",
    publicSettingsUrl: "/api/settings",
    fetchAdminSettings: vi.fn(),
    updateAdminSettings: api.updateAdminSettings,
  };
});

import { ApiRequestError } from "@portal/api-client";
import { SystemSettingsForm } from "./SystemSettingsForm";

const saved = {
  allowRegistration: true,
  defaultCurrency: "MXN",
  contactEmail: "contacto@portal.mx",
  contactPhone: null,
};

afterEach(() => {
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.mutate.mockReset();
  swr.mutateMatching.mockReset();
  api.updateAdminSettings.mockReset();
  useFlashStore.setState({ messages: [] });
});

describe("SystemSettingsForm", () => {
  it("muestra el estado de carga y el error con «Reintentar»", () => {
    render(<SystemSettingsForm />);
    expect(screen.getByRole("status").textContent).toContain("Cargando configuración");
    cleanup();

    swr.error = new Error("fallo");
    render(<SystemSettingsForm />);
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar la configuración");
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(swr.mutate).toHaveBeenCalled();
  });

  it("precarga lo guardado y deja «Guardar» deshabilitado hasta que hay cambios", async () => {
    swr.data = saved;
    render(<SystemSettingsForm />);

    await waitFor(() =>
      expect((screen.getByLabelText("Correo de contacto") as HTMLInputElement).value).toBe(
        "contacto@portal.mx",
      ),
    );
    expect((screen.getByLabelText("Teléfono de contacto") as HTMLInputElement).value).toBe("");
    expect(
      (
        screen.getByLabelText(
          /Permitir que las personas creen su propia cuenta/,
        ) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Guardar configuración" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("guarda los cambios, refresca la copia pública y muestra un mensaje flash", async () => {
    swr.data = saved;
    api.updateAdminSettings.mockResolvedValue({ ...saved, defaultCurrency: "USD" });
    render(<SystemSettingsForm />);
    await waitFor(() =>
      expect((screen.getByLabelText("Correo de contacto") as HTMLInputElement).value).toBe(
        "contacto@portal.mx",
      ),
    );

    fireEvent.change(screen.getByLabelText("Moneda por defecto"), { target: { value: "USD" } });
    fireEvent.click(screen.getByLabelText(/Permitir que las personas creen su propia cuenta/));
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    await waitFor(() => expect(api.updateAdminSettings).toHaveBeenCalled());
    expect(api.updateAdminSettings.mock.calls[0][0]).toEqual({
      allowRegistration: false,
      defaultCurrency: "USD",
      contactEmail: "contacto@portal.mx",
      contactPhone: null,
    });
    await waitFor(() =>
      expect(useFlashStore.getState().messages).toMatchObject([
        { kind: "success", text: "Configuración guardada." },
      ]),
    );
    expect(swr.mutateMatching).toHaveBeenCalledWith("/api/settings");
  });

  it("valida email y teléfono sin llamar a la API", async () => {
    swr.data = saved;
    render(<SystemSettingsForm />);
    await waitFor(() =>
      expect((screen.getByLabelText("Correo de contacto") as HTMLInputElement).value).not.toBe(""),
    );

    fireEvent.change(screen.getByLabelText("Correo de contacto"), { target: { value: "malo" } });
    fireEvent.change(screen.getByLabelText("Teléfono de contacto"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    expect(await screen.findByText("Ingresa un email válido")).toBeTruthy();
    expect(screen.getByText(/Usa solo dígitos|al menos 7/)).toBeTruthy();
    expect(api.updateAdminSettings).not.toHaveBeenCalled();
  });

  it("muestra el mensaje de la API y un flash de error si guardar falla", async () => {
    swr.data = saved;
    api.updateAdminSettings.mockRejectedValue(new ApiRequestError("Configuración no válida", 400));
    render(<SystemSettingsForm />);
    await waitFor(() =>
      expect((screen.getByLabelText("Correo de contacto") as HTMLInputElement).value).not.toBe(""),
    );

    fireEvent.change(screen.getByLabelText("Teléfono de contacto"), {
      target: { value: "55 1234 5678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Configuración no válida");
    expect(useFlashStore.getState().messages).toMatchObject([
      { kind: "error", text: "Configuración no válida" },
    ]);
  });
});
