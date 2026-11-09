import { describe, expect, it } from "vitest";
import { buildLocationQuery, buildMapsEmbedUrl, buildMapsSearchUrl } from "./maps";

const location = {
  address: "Calle 21 No. 310",
  commune: "Montebello",
  city: "Mérida",
  region: "Yucatán",
};

describe("buildLocationQuery", () => {
  it("une dirección, comuna, ciudad, región y país", () => {
    expect(buildLocationQuery(location)).toBe(
      "Calle 21 No. 310, Montebello, Mérida, Yucatán, México",
    );
  });
  it("omite partes vacías", () => {
    expect(buildLocationQuery({ ...location, address: "  ", commune: "" })).toBe(
      "Mérida, Yucatán, México",
    );
  });
});

describe("buildMapsSearchUrl", () => {
  it("codifica la ubicación en un enlace de búsqueda", () => {
    expect(buildMapsSearchUrl(location)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Calle%2021%20No.%20310%2C%20Montebello%2C%20M%C3%A9rida%2C%20Yucat%C3%A1n%2C%20M%C3%A9xico",
    );
  });
});

describe("buildMapsEmbedUrl", () => {
  it("sin clave de API usa el mapa incrustable público", () => {
    for (const apiKey of [undefined, "  "]) {
      const url = new URL(buildMapsEmbedUrl(location, apiKey));
      expect(url.origin + url.pathname).toBe("https://maps.google.com/maps");
      expect(url.searchParams.get("output")).toBe("embed");
      expect(url.searchParams.get("q")).toBe(
        "Calle 21 No. 310, Montebello, Mérida, Yucatán, México",
      );
    }
  });
  it("construye la URL del mapa incrustado con la clave", () => {
    const url = new URL(buildMapsEmbedUrl(location, "KEY123"));
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/embed/v1/place");
    expect(url.searchParams.get("key")).toBe("KEY123");
    expect(url.searchParams.get("q")).toBe("Calle 21 No. 310, Montebello, Mérida, Yucatán, México");
  });
});
