import type { Feature } from "@/generated/prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type { FeatureRepository } from "@/repositories/feature-repository";
import type { FeatureDto } from "@portal/shared-types";

type FeatureServiceDependencies = {
  features: FeatureRepository;
  properties: { findById(propertyId: string): Promise<unknown | null> };
};

/** «Cancha de pádel» → «cancha-de-padel». */
export function slugifyFeatureName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const toDto = ({ id, name, slug }: Feature): FeatureDto => ({ id, name, slug });

/** Catálogo de características y su asignación a propiedades (solo ADMIN, autorizado en la ruta). */
export function createFeatureService({ features, properties }: FeatureServiceDependencies) {
  return {
    async listFeatures(): Promise<FeatureDto[]> {
      return (await features.findAll()).map(toDto);
    },

    async createFeature(name: string): Promise<FeatureDto> {
      const slug = slugifyFeatureName(name);
      if (slug === "") throw new ValidationError("El nombre debe incluir letras o números");
      const existing = await features.findAll();
      if (existing.some((feature) => feature.slug === slug)) {
        throw new ConflictError("Ya existe una característica con ese nombre");
      }
      return toDto(await features.create({ name, slug }));
    },

    async setPropertyFeatures(propertyId: string, featureIds: string[]): Promise<FeatureDto[]> {
      if (!(await properties.findById(propertyId))) {
        throw new NotFoundError("Propiedad no encontrada");
      }
      const uniqueIds = [...new Set(featureIds)];
      const existingIds = new Set(await features.findExistingIds(uniqueIds));
      if (uniqueIds.some((featureId) => !existingIds.has(featureId))) {
        throw new ValidationError("Alguna característica no existe");
      }
      return (await features.setForProperty(propertyId, uniqueIds)).map(toDto);
    },
  };
}
