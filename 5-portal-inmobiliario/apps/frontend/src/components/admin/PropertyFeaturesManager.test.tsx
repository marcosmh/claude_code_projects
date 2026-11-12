// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const swr = vi.hoisted(() => ({
  data: undefined as unknown,
  error: undefined as unknown,
  mutate: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("swr", () => ({ default: () => swr }));
const api = vi.hoisted(() => ({ createAdminFeature: vi.fn(), setPropertyFeatures: vi.fn() }));
vi.mock("@portal/api-client", () => ({
  ...api,
  adminFeaturesUrl: "/api/admin/features",
  fetchAdminFeatures: vi.fn(),
  ApiRequestError: class extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
}));

import { ApiRequestError } from "@portal/api-client";
import { PropertyFeaturesManager } from "./PropertyFeaturesManager";

afterEach(() => {
  cleanup();
  swr.data = undefined;
  swr.error = undefined;
  swr.mutate.mockClear();
  Object.values(api).forEach((mock) => mock.mockReset());
});

const catalog = [
  { id: "f1", name: "Piscina", slug: "piscina" },
  { id: "f2", name: "Jardín", slug: "jardin" },
];

function setup() {
  swr.data = catalog;
  const onChanged = vi.fn().mockResolvedValue(undefined);
  render(<PropertyFeaturesManager propertyId="p1" features={[catalog[0]]} onChanged={onChanged} />);
  return { onChanged };
}

describe("PropertyFeaturesManager", () => {
  it("marca las características de la propiedad", () => {
    setup();
    expect((screen.getByLabelText("Piscina") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Jardín") as HTMLInputElement).checked).toBe(false);
  });

  it("guarda el conjunto completo al marcar una más", async () => {
    api.setPropertyFeatures.mockResolvedValue([]);
    const { onChanged } = setup();
    fireEvent.click(screen.getByLabelText("Jardín"));
    await waitFor(() => expect(api.setPropertyFeatures).toHaveBeenCalledWith("p1", ["f1", "f2"]));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("guarda sin la característica al desmarcarla", async () => {
    api.setPropertyFeatures.mockResolvedValue([]);
    setup();
    fireEvent.click(screen.getByLabelText("Piscina"));
    await waitFor(() => expect(api.setPropertyFeatures).toHaveBeenCalledWith("p1", []));
  });

  it("crea una nueva y la asigna", async () => {
    api.createAdminFeature.mockResolvedValue({ id: "f3", name: "Terraza", slug: "terraza" });
    api.setPropertyFeatures.mockResolvedValue([]);
    setup();
    fireEvent.change(screen.getByLabelText("Nueva característica"), {
      target: { value: "Terraza" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() => expect(api.createAdminFeature).toHaveBeenCalledWith("Terraza"));
    await waitFor(() => expect(api.setPropertyFeatures).toHaveBeenCalledWith("p1", ["f1", "f3"]));
    expect(swr.mutate).toHaveBeenCalled();
  });

  it("no crea con el nombre vacío y muestra el error del servidor", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByRole("alert").textContent).toContain("Escribe el nombre");
    expect(api.createAdminFeature).not.toHaveBeenCalled();

    api.createAdminFeature.mockRejectedValue(new ApiRequestError("Ya existe", 409));
    fireEvent.change(screen.getByLabelText("Nueva característica"), {
      target: { value: "Piscina" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Ya existe"));
  });

  it("muestra carga y error del catálogo", () => {
    render(<PropertyFeaturesManager propertyId="p1" features={[]} onChanged={vi.fn()} />);
    expect(screen.getByText("Cargando características…")).toBeTruthy();
    cleanup();
    swr.error = new Error("fallo");
    render(<PropertyFeaturesManager propertyId="p1" features={[]} onChanged={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("No pudimos cargar");
  });
});
