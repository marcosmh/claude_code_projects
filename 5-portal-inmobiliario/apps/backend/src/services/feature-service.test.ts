import { describe, expect, it, vi } from "vitest";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { FeatureRepository } from "@/repositories/feature-repository";
import { createFeatureService, slugifyFeatureName } from "./feature-service";

const stored = (id: string, name: string, slug: string) => ({
  id,
  name,
  slug,
  createdAt: new Date(),
});

function build(propertyExists = true) {
  const features: FeatureRepository = {
    findAll: vi.fn().mockResolvedValue([stored("f1", "Piscina", "piscina")]),
    create: vi.fn().mockImplementation(async (data) => stored("f2", data.name, data.slug)),
    findExistingIds: vi.fn().mockResolvedValue(["f1"]),
    setForProperty: vi.fn().mockResolvedValue([stored("f1", "Piscina", "piscina")]),
  };
  const properties = { findById: vi.fn().mockResolvedValue(propertyExists ? { id: "p1" } : null) };
  return { service: createFeatureService({ features, properties }), features };
}

describe("slugifyFeatureName", () => {
  it("quita acentos y signos y usa guiones", () => {
    expect(slugifyFeatureName("Cancha de pádel")).toBe("cancha-de-padel");
    expect(slugifyFeatureName("  ¡Pet friendly!  ")).toBe("pet-friendly");
    expect(slugifyFeatureName("???")).toBe("");
  });
});

describe("createFeature", () => {
  it("genera el slug y crea la característica", async () => {
    const { service, features } = build();
    await expect(service.createFeature("Cancha de pádel")).resolves.toEqual({
      id: "f2",
      name: "Cancha de pádel",
      slug: "cancha-de-padel",
    });
    expect(features.create).toHaveBeenCalledWith({
      name: "Cancha de pádel",
      slug: "cancha-de-padel",
    });
  });

  it("rechaza duplicados sin distinguir mayúsculas ni acentos", async () => {
    const { service, features } = build();
    await expect(service.createFeature("PISCÍNA")).rejects.toBeInstanceOf(ConflictError);
    expect(features.create).not.toHaveBeenCalled();
  });

  it("rechaza nombres sin letras ni números", async () => {
    await expect(build().service.createFeature("???")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("setPropertyFeatures", () => {
  it("quita repetidos y reemplaza el conjunto", async () => {
    const { service, features } = build();
    const result = await service.setPropertyFeatures("p1", ["f1", "f1"]);
    expect(features.setForProperty).toHaveBeenCalledWith("p1", ["f1"]);
    expect(result).toEqual([{ id: "f1", name: "Piscina", slug: "piscina" }]);
  });

  it("acepta un conjunto vacío", async () => {
    const { service, features } = build();
    await service.setPropertyFeatures("p1", []);
    expect(features.setForProperty).toHaveBeenCalledWith("p1", []);
  });

  it("rechaza ids desconocidos y propiedades inexistentes", async () => {
    const { service, features } = build();
    await expect(service.setPropertyFeatures("p1", ["f1", "zzz"])).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(features.setForProperty).not.toHaveBeenCalled();
    await expect(build(false).service.setPropertyFeatures("p1", [])).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
