import { describe, expect, it, vi } from "vitest";
import {
  NotFoundError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
  ValidationError,
} from "@/lib/errors";
import type { ImageStorage } from "@/lib/cloudinary/cloudinary-storage";
import type { PropertyImageRepository } from "@/repositories/property-image-repository";
import { PROPERTY_IMAGE_MAX_BYTES } from "@portal/shared-types";
import { createPropertyImageService, detectImageContentType } from "./property-image-service";

const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);

function build(overrides: { propertyExists?: boolean; createFails?: boolean } = {}) {
  const storage: ImageStorage = {
    upload: vi.fn().mockResolvedValue({
      url: "https://res.cloudinary.com/demo/propiedades-claude/a.jpg",
      publicId: "propiedades-claude/a",
    }),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  const images: PropertyImageRepository = {
    create: vi.fn().mockImplementation(async (_propertyId, image) => {
      if (overrides.createFails) throw new Error("db caída");
      return {
        id: "img-1",
        propertyId: "p1",
        ...image,
        position: 0,
        isPrimary: true,
        createdAt: new Date(),
      };
    }),
  };
  const properties = {
    findById: vi.fn().mockResolvedValue(overrides.propertyExists === false ? null : { id: "p1" }),
  };
  return { service: createPropertyImageService({ properties, images, storage }), storage, images };
}

const jpeg = (bytes = jpegBytes) => ({ bytes, contentType: "image/jpeg", filename: "casa.jpg" });

describe("detectImageContentType", () => {
  it("reconoce JPEG, PNG y WebP por su firma y rechaza lo demás", () => {
    expect(detectImageContentType(jpegBytes)).toBe("image/jpeg");
    expect(detectImageContentType(pngBytes)).toBe("image/png");
    expect(detectImageContentType(webpBytes)).toBe("image/webp");
    expect(detectImageContentType(new TextEncoder().encode("<svg></svg>"))).toBeNull();
    expect(detectImageContentType(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull();
  });
});

describe("uploadImage", () => {
  it("sube a Cloudinary, guarda url y publicId y devuelve la imagen", async () => {
    const { service, storage, images } = build();
    const result = await service.uploadImage("p1", jpeg());

    expect(storage.upload).toHaveBeenCalledOnce();
    expect(images.create).toHaveBeenCalledWith("p1", {
      url: "https://res.cloudinary.com/demo/propiedades-claude/a.jpg",
      publicId: "propiedades-claude/a",
    });
    expect(result).toEqual({
      id: "img-1",
      url: "https://res.cloudinary.com/demo/propiedades-claude/a.jpg",
      position: 0,
      isPrimary: true,
    });
    expect(result).not.toHaveProperty("publicId");
  });

  it("responde 404 si la propiedad no existe, sin subir nada", async () => {
    const { service, storage } = build({ propertyExists: false });
    await expect(service.uploadImage("x", jpeg())).rejects.toBeInstanceOf(NotFoundError);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("valida archivo vacío, tamaño y tipo antes de subir", async () => {
    const { service, storage } = build();
    await expect(service.uploadImage("p1", jpeg(new Uint8Array()))).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      service.uploadImage("p1", jpeg(new Uint8Array(PROPERTY_IMAGE_MAX_BYTES + 1))),
    ).rejects.toBeInstanceOf(PayloadTooLargeError);
    await expect(
      service.uploadImage("p1", {
        bytes: jpegBytes,
        contentType: "application/pdf",
        filename: "a.pdf",
      }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
    // Declara JPEG pero el contenido es otra cosa.
    await expect(
      service.uploadImage("p1", jpeg(new TextEncoder().encode("<script>alert(1)</script>"))),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
    // Declara PNG pero el contenido es JPEG.
    await expect(
      service.uploadImage("p1", { bytes: jpegBytes, contentType: "image/png", filename: "a.png" }),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeError);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("acepta el tamaño máximo exacto", async () => {
    const { service } = build();
    const bytes = new Uint8Array(PROPERTY_IMAGE_MAX_BYTES);
    bytes.set(jpegBytes);
    await expect(service.uploadImage("p1", jpeg(bytes))).resolves.toBeDefined();
  });

  it("elimina la imagen de Cloudinary si falla el guardado en PostgreSQL", async () => {
    const { service, storage } = build({ createFails: true });
    await expect(service.uploadImage("p1", jpeg())).rejects.toThrow("db caída");
    expect(storage.remove).toHaveBeenCalledWith("propiedades-claude/a");
  });
});
