import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
const testRunIdentifier = `test-${Date.now()}`;

describe.skipIf(!databaseUrl)("modelo de dominio (PostgreSQL)", () => {
  let client: PrismaClient;
  let userId: string;
  let propertyId: string;

  const buildPropertyData = (title: string) => ({
    title: `${testRunIdentifier} ${title}`,
    description: "Propiedad de prueba",
    operation: "SALE" as const,
    type: "HOUSE" as const,
    price: 2500000,
    address: "Av. Paseo Villas Las Joya 1011",
    commune: "Villas Las Joya",
    city: "Querétaro",
    region: "Querétaro",
  });

  beforeAll(async () => {
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    const user = await client.user.create({
      data: {
        email: `${testRunIdentifier}@example.com`,
        passwordHash: "hash-de-prueba",
        name: "Usuario de prueba",
      },
    });
    userId = user.id;
    const property = await client.property.create({
      data: buildPropertyData("base"),
    });
    propertyId = property.id;
  });

  afterAll(async () => {
    await client.inquiry.deleteMany({
      where: { email: { startsWith: testRunIdentifier } },
    });
    await client.property.deleteMany({
      where: { title: { startsWith: testRunIdentifier } },
    });
    await client.feature.deleteMany({
      where: { slug: { startsWith: testRunIdentifier } },
    });
    await client.user.deleteMany({
      where: { email: { startsWith: testRunIdentifier } },
    });
    await client.$disconnect();
  });

  it("aplica valores por defecto: rol USER, usuario activo, propiedad no publicada y MXN", async () => {
    const user = await client.user.findUniqueOrThrow({ where: { id: userId } });
    const property = await client.property.findUniqueOrThrow({
      where: { id: propertyId },
    });
    expect(user.role).toBe("USER");
    expect(user.isActive).toBe(true);
    expect(property.isPublished).toBe(false);
    expect(property.isFeatured).toBe(false);
    expect(property.currency).toBe("MXN");
  });

  it("rechaza emails de usuario duplicados", async () => {
    await expect(
      client.user.create({
        data: {
          email: `${testRunIdentifier}@example.com`,
          passwordHash: "otro",
          name: "Duplicado",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rechaza favoritos duplicados para el mismo usuario y propiedad", async () => {
    await client.favorite.create({ data: { userId, propertyId } });
    await expect(client.favorite.create({ data: { userId, propertyId } })).rejects.toMatchObject({
      code: "P2002",
    });
  });

  it("permite consultas de visitantes sin usuario", async () => {
    const inquiry = await client.inquiry.create({
      data: {
        propertyId,
        name: "Visitante",
        email: `${testRunIdentifier}-visitante@example.com`,
        message: "Quiero más información",
      },
    });
    expect(inquiry.userId).toBeNull();
    expect(inquiry.phone).toBeNull();
  });

  it("conserva la consulta y anula userId al eliminar al usuario", async () => {
    const temporaryUser = await client.user.create({
      data: {
        email: `${testRunIdentifier}-temporal@example.com`,
        passwordHash: "hash",
        name: "Temporal",
      },
    });
    const inquiry = await client.inquiry.create({
      data: {
        propertyId,
        userId: temporaryUser.id,
        name: "Temporal",
        email: `${testRunIdentifier}-temporal-consulta@example.com`,
        message: "Hola",
      },
    });
    await client.user.delete({ where: { id: temporaryUser.id } });
    const remaining = await client.inquiry.findUniqueOrThrow({
      where: { id: inquiry.id },
    });
    expect(remaining.userId).toBeNull();
  });

  it("relaciona características con múltiples propiedades sin columnas booleanas", async () => {
    const secondProperty = await client.property.create({
      data: buildPropertyData("segunda"),
    });
    const feature = await client.feature.create({
      data: {
        name: `${testRunIdentifier} Piscina`,
        slug: `${testRunIdentifier}-piscina`,
        properties: { connect: [{ id: propertyId }, { id: secondProperty.id }] },
      },
      include: { properties: true },
    });
    expect(feature.properties).toHaveLength(2);
  });

  it("permite una sola imagen principal por propiedad", async () => {
    await client.propertyImage.create({
      data: {
        propertyId,
        url: "https://res.cloudinary.com/demo/image/upload/a.jpg",
        publicId: `${testRunIdentifier}-a`,
        isPrimary: true,
      },
    });
    await expect(
      client.propertyImage.create({
        data: {
          propertyId,
          url: "https://res.cloudinary.com/demo/image/upload/b.jpg",
          publicId: `${testRunIdentifier}-b`,
          isPrimary: true,
        },
      }),
    ).rejects.toThrow();

    const secondary = await client.propertyImage.create({
      data: {
        propertyId,
        url: "https://res.cloudinary.com/demo/image/upload/c.jpg",
        publicId: `${testRunIdentifier}-c`,
        position: 1,
      },
    });
    expect(secondary.isPrimary).toBe(false);
  });

  it("rechaza publicId de imagen duplicado", async () => {
    await expect(
      client.propertyImage.create({
        data: {
          propertyId,
          url: "https://res.cloudinary.com/demo/image/upload/d.jpg",
          publicId: `${testRunIdentifier}-a`,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rechaza precios negativos", async () => {
    await expect(
      client.property.create({
        data: { ...buildPropertyData("precio negativo"), price: -1 },
      }),
    ).rejects.toThrow();
  });

  it("elimina en cascada imágenes, favoritos y consultas al borrar la propiedad", async () => {
    const property = await client.property.create({
      data: buildPropertyData("cascada"),
    });
    await client.propertyImage.create({
      data: {
        propertyId: property.id,
        url: "https://res.cloudinary.com/demo/image/upload/e.jpg",
        publicId: `${testRunIdentifier}-cascada`,
      },
    });
    await client.favorite.create({ data: { userId, propertyId: property.id } });
    await client.inquiry.create({
      data: {
        propertyId: property.id,
        name: "Cascada",
        email: `${testRunIdentifier}-cascada@example.com`,
        message: "Hola",
      },
    });

    await client.property.delete({ where: { id: property.id } });

    expect(await client.propertyImage.count({ where: { propertyId: property.id } })).toBe(0);
    expect(await client.favorite.count({ where: { propertyId: property.id } })).toBe(0);
    expect(await client.inquiry.count({ where: { propertyId: property.id } })).toBe(0);
  });
});
