/**
 * Sube a Cloudinary las imágenes de ejemplo del seed (alojadas en picsum.photos) y actualiza
 * sus URLs en la base. Es idempotente: solo toca las imágenes cuya URL sigue en picsum.photos,
 * así que puede repetirse hasta que todas estén migradas.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createCloudinaryStorage, loadCloudinaryConfig } from "../src/lib/cloudinary/cloudinary-storage";

const downloadTimeoutMs = 20_000;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL no está definida");
  const cloudinaryConfig = loadCloudinaryConfig(process.env);
  if (!cloudinaryConfig) throw new Error("Faltan las credenciales de Cloudinary");

  const storage = createCloudinaryStorage({ getConfig: () => cloudinaryConfig });
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const pendingImages = await client.propertyImage.findMany({
      where: { url: { contains: "picsum.photos" } },
      orderBy: [{ propertyId: "asc" }, { position: "asc" }],
    });
    console.log(`Imágenes por migrar: ${pendingImages.length}`);

    let migratedCount = 0;
    let failedCount = 0;
    for (const image of pendingImages) {
      try {
        const response = await fetch(image.url, {
          redirect: "follow",
          signal: AbortSignal.timeout(downloadTimeoutMs),
        });
        if (!response.ok) throw new Error(`descarga respondió ${response.status}`);
        const stored = await storage.upload({
          bytes: new Uint8Array(await response.arrayBuffer()),
          contentType: response.headers.get("content-type") ?? "image/jpeg",
          filename: `${image.id}.jpg`,
        });
        await client.propertyImage.update({
          where: { id: image.id },
          data: { url: stored.url, publicId: stored.publicId },
        });
        migratedCount += 1;
      } catch (error) {
        failedCount += 1;
        console.warn(`No se migró ${image.id}: ${error instanceof Error ? error.message : error}`);
      }
    }
    console.log(`Migradas: ${migratedCount}. Fallidas: ${failedCount}.`);
    if (failedCount > 0) process.exitCode = 1;
  } finally {
    await client.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
