// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const mutate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("swr", () => ({ useSWRConfig: () => ({ mutate }) }));
const api = vi.hoisted(() => ({ createAdminProperty: vi.fn(), updateAdminProperty: vi.fn() }));
vi.mock("@portal/api-client", () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  }
  return { ApiRequestError, adminPropertiesUrl: "/api/admin/properties", ...api };
});

import { ApiRequestError } from "@portal/api-client";
import { PropertyForm } from "./PropertyForm";

afterEach(() => {
  cleanup();
  router.push.mockReset();
  mutate.mockClear();
  api.createAdminProperty.mockReset();
  api.updateAdminProperty.mockReset();
});

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillRequired() {
  fill("Título", "Casa en Coyoacán");
  fill("Descripción", "Casa amplia con jardín y cochera.");
  fill("Precio", "4850000");
  fill("Dirección", "Calle Hidalgo 12");
  fill("Colonia", "Coyoacán");
  fill("Ciudad", "Ciudad de México");
  fill("Estado", "CDMX");
}

describe("PropertyForm", () => {
  it("no tiene campos de latitud ni longitud", () => {
    render(<PropertyForm />);
    expect(screen.queryByLabelText(/latitud|longitud/i)).toBeNull();
    expect(screen.getByLabelText("Publicada")).toBeTruthy();
    expect(screen.getByLabelText("Destacada")).toBeTruthy();
  });

  it("muestra los errores de validación y no llama a la API", async () => {
    render(<PropertyForm />);
    fireEvent.click(screen.getByRole("button", { name: "Crear propiedad" }));

    expect(await screen.findByText("El título es obligatorio")).toBeTruthy();
    expect(screen.getByText("El precio es obligatorio")).toBeTruthy();
    expect(api.createAdminProperty).not.toHaveBeenCalled();
  });

  it("crea la propiedad con números y abre su edición para agregar imágenes", async () => {
    api.createAdminProperty.mockResolvedValue({ id: "nueva" });
    render(<PropertyForm />);
    fillRequired();
    fill("Dormitorios", "3");
    fireEvent.click(screen.getByLabelText("Publicada"));
    fireEvent.click(screen.getByRole("button", { name: "Crear propiedad" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin/properties/nueva/edit"));
    expect(api.createAdminProperty).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Casa en Coyoacán",
        price: 4850000,
        bedrooms: 3,
        usableArea: null,
        operation: "SALE",
        currency: "MXN",
        isPublished: true,
        isFeatured: false,
      }),
    );
    expect(mutate).toHaveBeenCalled();
  });

  it("al editar rellena los valores y usa PUT con el id", async () => {
    api.updateAdminProperty.mockResolvedValue({ id: "p1" });
    render(
      <PropertyForm
        property={{
          id: "p1",
          title: "Departamento en Roma",
          description: "Departamento luminoso y remodelado.",
          operation: "RENT",
          type: "APARTMENT",
          price: 18000,
          currency: "MXN",
          availability: "AVAILABLE",
          usableArea: 70,
          totalArea: null,
          bedrooms: 2,
          bathrooms: 1,
          parkingSpots: null,
          age: 5,
          address: "Calle Durango 1",
          commune: "Roma Norte",
          city: "Ciudad de México",
          region: "CDMX",
          isPublished: true,
          isFeatured: false,
          createdAt: "",
          updatedAt: "",
          images: [],
          features: [],
        }}
      />,
    );
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(
      "Departamento en Roma",
    );
    expect((screen.getByLabelText("Operación") as HTMLSelectElement).value).toBe("RENT");

    fill("Precio", "19000");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(api.updateAdminProperty).toHaveBeenCalled());
    expect(api.updateAdminProperty).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ price: 19000, totalArea: null, usableArea: 70 }),
    );
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/admin/properties"));
  });

  it("muestra el mensaje de la API y conserva lo escrito si falla", async () => {
    api.createAdminProperty.mockRejectedValue(new ApiRequestError("Datos inválidos", 400));
    render(<PropertyForm />);
    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: "Crear propiedad" }));

    expect((await screen.findByRole("alert")).textContent).toBe("Datos inválidos");
    expect(router.push).not.toHaveBeenCalled();
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe("Casa en Coyoacán");
  });
});
