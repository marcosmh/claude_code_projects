// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PropertyMap } from "./PropertyMap";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const props = {
  title: "Casa en Mérida",
  address: "Calle 21 No. 310",
  commune: "Montebello",
  city: "Mérida",
  region: "Yucatán",
};

describe("PropertyMap", () => {
  it("muestra el mapa incrustado y el enlace cuando hay clave", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "KEY123");
    render(<PropertyMap {...props} />);
    const frame = screen.getByTitle("Mapa de ubicación de Casa en Mérida");
    expect(frame.getAttribute("src")).toContain(
      "https://www.google.com/maps/embed/v1/place?key=KEY123",
    );
    expect(screen.getByText("Calle 21 No. 310, Montebello, Mérida, Yucatán, México")).toBeTruthy();
    const link = screen.getByRole("link", { name: /Abrir en Google Maps/ });
    expect(link.getAttribute("href")).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("sin clave muestra solo la dirección y el enlace", () => {
    vi.stubEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "");
    render(<PropertyMap {...props} />);
    expect(screen.queryByTitle(/Mapa de ubicación/)).toBeNull();
    expect(screen.getByRole("link", { name: /Abrir en Google Maps/ })).toBeTruthy();
  });
});
