// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  uploadPropertyImage: vi.fn(),
  deletePropertyImage: vi.fn(),
  setPrimaryPropertyImage: vi.fn(),
  reorderPropertyImages: vi.fn(),
}));
vi.mock("@portal/api-client", () => ({
  ...api,
  ApiRequestError: class extends Error {
    constructor(
      message: string,
      readonly status: number,
    ) {
      super(message);
    }
  },
}));
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

import { ApiRequestError } from "@portal/api-client";
import { PropertyImagesManager } from "./PropertyImagesManager";

afterEach(() => {
  cleanup();
  Object.values(api).forEach((mock) => mock.mockReset());
});

const images = [
  { id: "a", url: "https://res.cloudinary.com/demo/a.jpg", position: 0, isPrimary: true },
  { id: "b", url: "https://res.cloudinary.com/demo/b.jpg", position: 1, isPrimary: false },
  { id: "c", url: "https://res.cloudinary.com/demo/c.jpg", position: 2, isPrimary: false },
];

function setup(list = images) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  render(
    <PropertyImagesManager propertyId="p1" title="Casa" images={list} onChanged={onChanged} />,
  );
  return { onChanged };
}

describe("PropertyImagesManager", () => {
  it("muestra un estado vacío sin imágenes", () => {
    setup([]);
    expect(screen.getByText(/todavía no tiene imágenes/)).toBeTruthy();
  });

  it("marca la principal y deshabilita sus acciones no aplicables", () => {
    setup();
    expect(screen.getByText("Principal")).toBeTruthy();
    const primary = screen.getByRole("button", { name: "Marcar como principal la imagen 1" });
    expect((primary as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Mover antes la imagen 1" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Mover después la imagen 3" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("cambia la imagen principal y recarga", async () => {
    api.setPrimaryPropertyImage.mockResolvedValue([]);
    const { onChanged } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como principal la imagen 2" }));
    await waitFor(() => expect(api.setPrimaryPropertyImage).toHaveBeenCalledWith("p1", "b"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it("reordena enviando todos los ids en el nuevo orden", async () => {
    api.reorderPropertyImages.mockResolvedValue([]);
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Mover antes la imagen 3" }));
    await waitFor(() =>
      expect(api.reorderPropertyImages).toHaveBeenCalledWith("p1", ["a", "c", "b"]),
    );
  });

  it("pide confirmación antes de eliminar", async () => {
    api.deletePropertyImage.mockResolvedValue(undefined);
    const { onChanged } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar la imagen 2" }));
    expect(api.deletePropertyImage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    await waitFor(() => expect(api.deletePropertyImage).toHaveBeenCalledWith("p1", "b"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cancelar no elimina nada", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar la imagen 1" }));
    fireEvent.click(screen.getByRole("button", { name: "No, cancelar" }));
    expect(api.deletePropertyImage).not.toHaveBeenCalled();
  });

  it("muestra el error si una acción falla", async () => {
    api.setPrimaryPropertyImage.mockRejectedValue(new ApiRequestError("Imagen no encontrada", 404));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como principal la imagen 2" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Imagen no encontrada");
  });

  it("sube varias imágenes y reporta las inválidas sin enviarlas", async () => {
    api.uploadPropertyImage.mockResolvedValue({});
    const { onChanged } = setup();
    const good = new File(["x"], "uno.jpg", { type: "image/jpeg" });
    const other = new File(["x"], "dos.png", { type: "image/png" });
    const bad = new File(["x"], "nota.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Agregar imágenes"), {
      target: { files: [good, bad, other] },
    });

    await waitFor(() => expect(api.uploadPropertyImage).toHaveBeenCalledTimes(2));
    expect(api.uploadPropertyImage).toHaveBeenCalledWith("p1", good);
    expect((await screen.findByRole("alert")).textContent).toContain("nota.txt");
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("status").textContent).toContain("Se subieron 2");
  });
});
