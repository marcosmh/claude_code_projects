import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  seedFeatures,
  seedImagesPerProperty,
  seedProperties,
} from "./seed-data";

const shouldResetExistingData = process.argv.includes("--reset");

function buildSeedImageUrl(propertyIndex: number, imageIndex: number): string {
  // Imágenes de ejemplo determinísticas. Las reales se suben a Cloudinary (Paso 26).
  return `https://picsum.photos/seed/portal-${propertyIndex}-${imageIndex}/1200/800`;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("El seed de desarrollo no debe ejecutarse en producción");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no está definida");
  }

  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const existingPropertyCount = await client.property.count();

    if (existingPropertyCount > 0 && !shouldResetExistingData) {
      console.log(
        `Ya existen ${existingPropertyCount} propiedades. Seed omitido (usa --reset para recrear los datos).`,
      );
      return;
    }

    if (shouldResetExistingData) {
      // Las imágenes, favoritos y consultas se eliminan en cascada con la propiedad.
      await client.property.deleteMany();
      await client.feature.deleteMany();
    }

    await client.feature.createMany({ data: seedFeatures });
    const features = await client.feature.findMany();
    const featureIdBySlug = new Map(features.map((feature) => [feature.slug, feature.id]));

    for (const [propertyIndex, seedProperty] of seedProperties.entries()) {
      const { featureSlugs, ...propertyData } = seedProperty;

      await client.property.create({
        data: {
          ...propertyData,
          features: {
            connect: featureSlugs.map((slug) => {
              const featureId = featureIdBySlug.get(slug);
              if (!featureId) throw new Error(`Característica desconocida: ${slug}`);
              return { id: featureId };
            }),
          },
          images: {
            create: Array.from({ length: seedImagesPerProperty }, (_, imageIndex) => ({
              url: buildSeedImageUrl(propertyIndex, imageIndex),
              publicId: `seed/property-${propertyIndex}-${imageIndex}`,
              position: imageIndex,
              isPrimary: imageIndex === 0,
            })),
          },
        },
      });
    }

    console.log(
      `Seed completado: ${seedProperties.length} propiedades, ${seedFeatures.length} características, ${seedProperties.length * seedImagesPerProperty} imágenes.`,
    );
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Falló el seed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
