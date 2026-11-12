import { describe, expect, it } from "vitest";
import { buildCloudinaryUrl, cloudinaryLoader, imageLoaderFor } from "./image-loader";

const original =
  "https://res.cloudinary.com/demo/image/upload/v1700000000/propiedades-claude/casa.jpg";

describe("buildCloudinaryUrl", () => {
  it("inserta formato, calidad y ancho tras /image/upload/", () => {
    expect(buildCloudinaryUrl({ src: original, width: 640 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v1700000000/propiedades-claude/casa.jpg",
    );
  });

  it("respeta una calidad explícita", () => {
    expect(buildCloudinaryUrl({ src: original, width: 320, quality: 60 })).toContain(
      "f_auto,q_60,c_limit,w_320/",
    );
  });

  it.each([
    "https://picsum.photos/seed/a/800/600",
    "/hero-building.jpg",
    "https://res.cloudinary.com/demo/raw/upload/archivo.pdf",
    "https://evil.example.com/res.cloudinary.com/image/upload/a.jpg",
  ])("devuelve null para %s", (src) => {
    expect(buildCloudinaryUrl({ src, width: 640 })).toBeNull();
  });
});

describe("imageLoaderFor", () => {
  it("usa el cargador de Cloudinary solo para sus URLs", () => {
    expect(imageLoaderFor(original)).toBe(cloudinaryLoader);
    expect(imageLoaderFor("/hero-building.jpg")).toBeUndefined();
    expect(imageLoaderFor("https://picsum.photos/seed/a/800/600")).toBeUndefined();
  });

  it("el cargador devuelve la URL original si no es de Cloudinary", () => {
    expect(cloudinaryLoader({ src: "/x.jpg", width: 100 })).toBe("/x.jpg");
  });
});
