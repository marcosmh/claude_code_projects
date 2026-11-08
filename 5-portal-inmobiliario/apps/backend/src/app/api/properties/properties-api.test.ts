import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { GET as getPropertyById } from "./[id]/route";
import { GET as listProperties } from "./route";

const databaseUrl = process.env.DATABASE_URL;
const testRunIdentifier = `api-test-${Date.now()}`;

type ListBody = {
  items: {
    id: string;
    title: string;
    operation: string;
    isFeatured: boolean;
    primaryImageUrl: string | null;
  }[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

function buildListRequest(search = ""): NextRequest {
  return new NextRequest(`http://localhost/api/properties${search}`);
}

describe.skipIf(!databaseUrl)("API REST pública de propiedades", () => {
  let client: PrismaClient;
  let publishedId: string;
  let draftId: string;

  const propertyData = (title: string, isPublished: boolean) => ({
    title: `${testRunIdentifier} ${title}`,
    description: "Propiedad de prueba",
    operation: "RENT" as const,
    type: "APARTMENT" as const,
    price: 15000,
    address: "Calle de prueba 1",
    commune: "Roma Norte",
    city: "Ciudad de México",
    region: "Ciudad de México",
    isPublished,
  });

  beforeAll(async () => {
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl as string }),
    });
    const published = await client.property.create({
      data: {
        ...propertyData("publicada", true),
        images: {
          create: [
            { url: "https://example.com/b.jpg", publicId: `${testRunIdentifier}-b`, position: 1 },
            { url: "https://example.com/a.jpg", publicId: `${testRunIdentifier}-a`, position: 0, isPrimary: true },
          ],
        },
        features: {
          create: [{ name: `${testRunIdentifier} Gimnasio`, slug: `${testRunIdentifier}-gym` }],
        },
      },
    });
    const draft = await client.property.create({ data: propertyData("borrador", false) });
    publishedId = published.id;
    draftId = draft.id;
  });

  afterAll(async () => {
    await client.property.deleteMany({ where: { title: { startsWith: testRunIdentifier } } });
    await client.feature.deleteMany({ where: { slug: { startsWith: testRunIdentifier } } });
    await client.$disconnect();
  });

  it("GET /api/properties lista solo propiedades publicadas", async () => {
    const response = await listProperties(buildListRequest("?pageSize=50"));
    const body = (await response.json()) as ListBody;

    expect(response.status).toBe(200);
    const titles = body.items.map((item) => item.title);
    expect(titles).toContain(`${testRunIdentifier} publicada`);
    expect(titles).not.toContain(`${testRunIdentifier} borrador`);
    const published = body.items.find((item) => item.id === publishedId);
    expect(published?.primaryImageUrl).toBe("https://example.com/a.jpg");
  });

  it("GET /api/properties filtra por operation y featured en la base", async () => {
    const rentResponse = await listProperties(buildListRequest("?operation=RENT&pageSize=50"));
    const rentBody = (await rentResponse.json()) as ListBody;
    expect(rentResponse.status).toBe(200);
    expect(rentBody.items.length).toBeGreaterThan(0);
    expect(rentBody.items.every((item) => item.operation === "RENT")).toBe(true);

    const featuredResponse = await listProperties(buildListRequest("?featured=true&pageSize=50"));
    const featuredBody = (await featuredResponse.json()) as ListBody;
    expect(featuredBody.items.every((item) => item.isFeatured)).toBe(true);
  });

  it("GET /api/properties responde 400 con operation inválida", async () => {
    const response = await listProperties(buildListRequest("?operation=LEASE"));
    expect(response.status).toBe(400);
  });

  describe("búsqueda de texto sin acentos ni mayúsculas", () => {
    // Ciudad con acento y ñ, y colonia con diéresis, únicas de esta ejecución.
    const city = `Zapópan${testRunIdentifier}`;
    let accentedId: string;

    const searchTitles = async (searchText: string): Promise<string[]> => {
      const response = await listProperties(
        buildListRequest(`?pageSize=50&search=${encodeURIComponent(searchText)}`),
      );
      expect(response.status).toBe(200);
      return ((await response.json()) as ListBody).items.map((item) => item.id);
    };

    beforeAll(async () => {
      const created = await client.property.create({
        data: {
          ...propertyData("con acentos", true),
          title: `${testRunIdentifier} Casa Nuñez en Peña`,
          city,
          commune: "Colonia Güemes",
          region: "Jalisco",
          description: "Cerca del parque Méxicó",
        },
      });
      accentedId = created.id;
    });

    it("encuentra la ciudad escribiéndola sin acento", async () => {
      expect(await searchTitles(city.replace("ó", "o"))).toContain(accentedId);
    });

    it("encuentra la ciudad escribiéndola con acento", async () => {
      expect(await searchTitles(city)).toContain(accentedId);
    });

    it("ignora mayúsculas y minúsculas", async () => {
      expect(await searchTitles(city.toUpperCase())).toContain(accentedId);
      expect(await searchTitles(city.toLowerCase())).toContain(accentedId);
    });

    it("ignora acentos en cualquier campo: título, colonia y descripción", async () => {
      expect(await searchTitles("nunez pena")).toContain(accentedId);
      expect(await searchTitles("GÜEMES")).toContain(accentedId);
      expect(await searchTitles("guemes")).toContain(accentedId);
      expect(await searchTitles("mexico")).toContain(accentedId);
    });

    it("exige que todos los términos coincidan", async () => {
      expect(await searchTitles(`${city.replace("ó", "o")} jalisco`)).toContain(accentedId);
      expect(await searchTitles(`${city} inexistente`)).not.toContain(accentedId);
    });

    it("no trata % ni _ como comodines", async () => {
      expect(await searchTitles("%")).toEqual([]);
      expect(await searchTitles("_")).toEqual([]);
    });

    it("no devuelve propiedades no publicadas aunque coincidan", async () => {
      expect(await searchTitles(`${testRunIdentifier} borrador`)).not.toContain(draftId);
    });

    it("se combina con otros filtros", async () => {
      const response = await listProperties(
        buildListRequest(`?search=${encodeURIComponent(city)}&operation=SALE`),
      );
      // La propiedad de prueba es de arriendo (RENT): con operation=SALE no aparece.
      expect(((await response.json()) as ListBody).items.map((item) => item.id)).not.toContain(accentedId);
    });

    it("devuelve el total correcto de coincidencias", async () => {
      const response = await listProperties(buildListRequest(`?search=${encodeURIComponent(city)}`));
      const body = (await response.json()) as ListBody;
      expect(body.total).toBe(1);
      expect(body.items).toHaveLength(1);
    });
  });

  it("GET /api/properties pagina los resultados", async () => {
    const response = await listProperties(buildListRequest("?page=1&pageSize=2"));
    const body = (await response.json()) as ListBody;

    expect(response.status).toBe(200);
    expect(body.items.length).toBeLessThanOrEqual(2);
    expect(body).toMatchObject({ page: 1, pageSize: 2 });
    expect(body.totalPages).toBe(Math.ceil(body.total / 2));
  });

  it("GET /api/properties responde 400 con parámetros inválidos", async () => {
    const response = await listProperties(buildListRequest("?pageSize=500"));
    const body = (await response.json()) as { message: string; status: number };
    expect(response.status).toBe(400);
    expect(body).toMatchObject({ message: "Parámetros de consulta inválidos", status: 400 });
  });

  it("GET /api/properties/{id} devuelve el detalle con imágenes ordenadas y características", async () => {
    const response = await getPropertyById(
      new NextRequest(`http://localhost/api/properties/${publishedId}`),
      { params: Promise.resolve({ id: publishedId }) },
    );
    const body = (await response.json()) as {
      id: string;
      price: number;
      images: { url: string; position: number }[];
      features: { slug: string }[];
    };

    expect(response.status).toBe(200);
    expect(body.id).toBe(publishedId);
    expect(body.price).toBe(15000);
    expect(body.images.map((image) => image.position)).toEqual([0, 1]);
    expect(body.features[0].slug).toBe(`${testRunIdentifier}-gym`);
    expect(JSON.stringify(body)).not.toContain("publicId");
  });

  it("GET /api/properties/{id} responde 404 para una propiedad no publicada", async () => {
    const response = await getPropertyById(
      new NextRequest(`http://localhost/api/properties/${draftId}`),
      { params: Promise.resolve({ id: draftId }) },
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Propiedad no encontrada", status: 404 });
  });

  it("GET /api/properties/{id} responde 404 para un id inexistente", async () => {
    const response = await getPropertyById(
      new NextRequest("http://localhost/api/properties/no-existe"),
      { params: Promise.resolve({ id: "no-existe" }) },
    );
    expect(response.status).toBe(404);
  });
});
