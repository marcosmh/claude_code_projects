// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PropertyGallery } from "./PropertyGallery";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

afterEach(cleanup);

const images = [
  { id: "c", url: "https://example.com/c.jpg", position: 2, isPrimary: false },
  { id: "a", url: "https://example.com/a.jpg", position: 0, isPrimary: false },
  { id: "p", url: "https://example.com/p.jpg", position: 1, isPrimary: true },
];

function currentSrc(): string {
  return screen.getByAltText(/^Fotografía \d de \d de Casa$/).getAttribute("src") ?? "";
}

describe("PropertyGallery", () => {
  it("muestra primero la imagen principal y el contador", () => {
    render(<PropertyGallery images={images} propertyTitle="Casa" />);
    expect(currentSrc()).toBe("https://example.com/p.jpg");
    expect(screen.getByText("1 de 3")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Ver fotografía/ })).toHaveLength(3);
  });

  it("avanza y retrocede con los botones de forma circular", async () => {
    const user = userEvent.setup();
    render(<PropertyGallery images={images} propertyTitle="Casa" />);
    await user.click(screen.getByRole("button", { name: "Imagen siguiente" }));
    expect(currentSrc()).toBe("https://example.com/a.jpg");
    await user.click(screen.getByRole("button", { name: "Imagen anterior" }));
    await user.click(screen.getByRole("button", { name: "Imagen anterior" }));
    expect(currentSrc()).toBe("https://example.com/c.jpg");
    expect(screen.getByText("3 de 3")).toBeTruthy();
  });

  it("cambia de imagen al elegir una miniatura y la marca como actual", async () => {
    const user = userEvent.setup();
    render(<PropertyGallery images={images} propertyTitle="Casa" />);
    const thumbnails = screen.getAllByRole("button", { name: /Ver fotografía/ });
    await user.click(thumbnails[2] as HTMLElement);
    expect(currentSrc()).toBe("https://example.com/c.jpg");
    expect(thumbnails[2]?.getAttribute("aria-current")).toBe("true");
    expect(thumbnails[0]?.getAttribute("aria-current")).toBeNull();
  });

  it("navega con las flechas del teclado", async () => {
    const user = userEvent.setup();
    render(<PropertyGallery images={images} propertyTitle="Casa" />);
    screen.getByRole("button", { name: "Imagen siguiente" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(currentSrc()).toBe("https://example.com/a.jpg");
    await user.keyboard("{ArrowLeft}");
    expect(currentSrc()).toBe("https://example.com/p.jpg");
  });

  it("oculta controles y miniaturas con una sola imagen", () => {
    render(<PropertyGallery images={[images[0]!]} propertyTitle="Casa" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(/1 de 1/)).toBeNull();
  });

  it("no falla sin imágenes y conserva el contenido superpuesto", () => {
    render(<PropertyGallery images={[]} propertyTitle="Casa" overlay={<span>Venta</span>} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Venta")).toBeTruthy();
  });
});
