// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const site = vi.hoisted(() => ({
  settings: {
    allowRegistration: true,
    defaultCurrency: "MXN",
    contactEmail: null as string | null,
    contactPhone: null as string | null,
  },
}));
vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({ settings: site.settings, isLoaded: true }),
}));

import { FooterContact } from "./FooterContact";

afterEach(() => {
  cleanup();
  site.settings = { ...site.settings, contactEmail: null, contactPhone: null };
});

describe("FooterContact", () => {
  it("no renderiza nada sin datos de contacto", () => {
    const { container } = render(<FooterContact />);
    expect(container.firstChild).toBeNull();
  });

  it("muestra el correo y el teléfono como enlaces mailto y tel", () => {
    site.settings = {
      ...site.settings,
      contactEmail: "contacto@portal.mx",
      contactPhone: "+52 (55) 1234-5678",
    };
    render(<FooterContact />);

    expect(screen.getByRole("link", { name: "contacto@portal.mx" }).getAttribute("href")).toBe(
      "mailto:contacto@portal.mx",
    );
    expect(screen.getByRole("link", { name: "+52 (55) 1234-5678" }).getAttribute("href")).toBe(
      "tel:+525512345678",
    );
  });

  it("muestra solo lo configurado", () => {
    site.settings = { ...site.settings, contactPhone: "5512345678" };
    render(<FooterContact />);
    expect(screen.queryByRole("link", { name: /@/ })).toBeNull();
    expect(screen.getByRole("link", { name: "5512345678" })).toBeTruthy();
  });
});
