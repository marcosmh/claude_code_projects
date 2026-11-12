import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Cumplimiento arquitectónico (spec §55): reglas de CLAUDE.md convertidas en pruebas, para que un
 * cambio futuro que las rompa falle la suite en lugar de depender de una revisión manual.
 */
const repositoryRoot = path.resolve(__dirname, "../../..");
const backendSource = path.join(repositoryRoot, "apps/backend/src");
const frontendSource = path.join(repositoryRoot, "apps/frontend/src");
const packagesRoot = path.join(repositoryRoot, "packages");

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = path.join(directory, entry);
    if (entry === "node_modules" || entry === "generated") return [];
    return statSync(fullPath).isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

const isSource = (file: string) => /\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file);
const read = (file: string) => readFileSync(file, "utf8");
const relative = (file: string) => path.relative(repositoryRoot, file);

const backendFiles = listFiles(backendSource).filter(isSource);
const frontendFiles = listFiles(frontendSource).filter(isSource);
const packageFiles = listFiles(packagesRoot).filter(isSource);
const allSource = [...backendFiles, ...frontendFiles, ...packageFiles];

const dependenciesOf = (workspace: string) => {
  const manifest = JSON.parse(read(path.join(repositoryRoot, workspace, "package.json"))) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  return Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
};

describe("sin Server Actions", () => {
  it('ningún archivo usa la directiva "use server"', () => {
    const offenders = allSource.filter((file) => /^\s*["']use server["']/m.test(read(file)));
    expect(offenders.map(relative)).toEqual([]);
  });
});

describe("comunicación REST", () => {
  it("la API vive solo en el backend: el frontend no define Route Handlers", () => {
    expect(frontendFiles.filter((file) => /\/route\.ts$/.test(file)).map(relative)).toEqual([]);
    expect(
      backendFiles.filter((file) => /\/app\/api\/.*\/route\.ts$/.test(file)).length,
    ).toBeGreaterThan(0);
  });

  it("los componentes y hooks del frontend no llaman a fetch: usan @portal/api-client", () => {
    const allowedFetchUsers = new Set([
      "apps/frontend/src/proxy.ts", // barrera de páginas (servidor): consulta la sesión al backend
      "apps/frontend/src/lib/web3forms.ts", // integración externa que corre en el navegador (spec §31)
    ]);
    const offenders = frontendFiles
      .filter((file) => /\bfetch\(/.test(read(file)))
      .map(relative)
      .filter((file) => !allowedFetchUsers.has(file));
    expect(offenders).toEqual([]);
  });

  it("el frontend consume el backend solo mediante rutas /api del mismo origen", () => {
    const offenders = frontendFiles
      .filter((file) => /https?:\/\/(localhost|127\.0\.0\.1)/.test(read(file)))
      .map(relative)
      // Valores por defecto del proxy y de la metadata del servidor (leen variables de entorno).
      .filter(
        (file) =>
          ![
            "apps/frontend/src/proxy.ts",
            "apps/frontend/src/lib/server-property.ts",
            "apps/frontend/src/app/layout.tsx",
          ].includes(file),
      );
    expect(offenders).toEqual([]);
  });
});

describe("PostgreSQL como única base de datos y React sin acceso a la base", () => {
  const forbiddenDatabasePackages =
    /^(mysql2?|sqlite3|better-sqlite3|mongodb|mongoose|redis|ioredis|typeorm|sequelize|knex|drizzle-orm|@libsql\/.*|@neondatabase\/.*)$/;

  it.each(["apps/backend", "apps/frontend", "packages/shared-types", "packages/api-client"])(
    "%s no declara otros motores de base de datos",
    (workspace) => {
      expect(
        dependenciesOf(workspace).filter((name) => forbiddenDatabasePackages.test(name)),
      ).toEqual([]);
    },
  );

  it("el frontend y los paquetes compartidos no dependen de Prisma ni de pg", () => {
    for (const workspace of ["apps/frontend", "packages/shared-types", "packages/api-client"]) {
      expect(dependenciesOf(workspace).filter((name) => /prisma|^pg$/.test(name))).toEqual([]);
    }
  });

  it("ningún código del frontend o de los paquetes importa Prisma, pg o el backend", () => {
    const offenders = [...frontendFiles, ...packageFiles].filter((file) =>
      /from ["'](@prisma\/|pg["']|.*generated\/prisma|.*apps\/backend)/.test(read(file)),
    );
    expect(offenders.map(relative)).toEqual([]);
  });

  it("solo los repositorios y la infraestructura tocan la base de datos en el backend", () => {
    const allowedPrefixes = ["apps/backend/src/repositories/", "apps/backend/src/lib/database/"];
    const offenders = backendFiles
      .filter((file) => /from ["']@\/lib\/database\/client["']/.test(read(file)))
      .map(relative)
      .filter((file) => !allowedPrefixes.some((prefix) => file.startsWith(prefix)));
    expect(offenders).toEqual([]);
  });
});

describe("capas del backend: Route Handler → servicio → repositorio", () => {
  const routeFiles = backendFiles.filter((file) => /\/app\/api\/.*\/route\.ts$/.test(file));

  it("los Route Handlers no importan repositorios ni Prisma: solo servicios", () => {
    const offenders = routeFiles.filter((file) =>
      /from ["']@\/(repositories|lib\/database)|@prisma\//.test(read(file)),
    );
    expect(offenders.map(relative)).toEqual([]);
  });

  it("los servicios no acceden a la base de datos directamente", () => {
    const serviceFiles = backendFiles.filter(
      (file) => file.includes("/src/services/") && !file.endsWith("/services.ts"),
    );
    const offenders = serviceFiles.filter((file) =>
      /from ["']@\/lib\/database|@prisma\/client/.test(read(file)),
    );
    expect(offenders.map(relative)).toEqual([]);
  });
});

describe("permisos en el backend", () => {
  const routeFiles = backendFiles.filter((file) => /\/app\/api\/.*\/route\.ts$/.test(file));
  const exportedHandlers = (source: string) =>
    [
      ...source.matchAll(/export (?:const|async function|function) (GET|POST|PUT|PATCH|DELETE)\b/g),
    ].map((match) => match[1]);

  it("todo Route Handler de /api/admin está protegido con withRole('ADMIN')", () => {
    const adminRoutes = routeFiles.filter((file) => file.includes("/app/api/admin/"));
    expect(adminRoutes.length).toBeGreaterThan(0);
    for (const file of adminRoutes) {
      const source = read(file);
      const handlers = exportedHandlers(source);
      const protectedHandlers = [
        ...source.matchAll(
          /export const (GET|POST|PUT|PATCH|DELETE)\s*=\s*withRole(?:<[^>]*>)?\(\s*"ADMIN"/g,
        ),
      ];
      expect(protectedHandlers.length, relative(file)).toBe(handlers.length);
    }
  });

  it("los recursos de usuario (favoritos y mis consultas) exigen sesión USER", () => {
    for (const fragment of [
      "/app/api/favorites/",
      "/app/api/inquiries/mine/",
      "/app/api/inquiries/[inquiryId]/",
    ]) {
      for (const file of routeFiles.filter((candidate) => candidate.includes(fragment))) {
        expect(read(file), relative(file)).toMatch(/withRole(?:<[^>]*>)?\(\s*"USER"/);
      }
    }
  });

  it("las rutas sin withRole son exactamente las públicas previstas", () => {
    const publicRoutes = routeFiles
      .filter((file) => !/withRole(?:<[^>]*>)?\(/.test(read(file)))
      .map((file) => path.relative(path.join(backendSource, "app/api"), file).replace(/\\/g, "/"))
      .sort();
    expect(publicRoutes).toEqual(
      [
        "auth/login/route.ts",
        "auth/logout/route.ts",
        "auth/register/route.ts",
        "inquiries/route.ts",
        "locations/route.ts",
        "properties/[id]/route.ts",
        "properties/route.ts",
      ].sort(),
    );
  });
});

describe("integraciones externas y secretos", () => {
  it("Cloudinary se usa solo en el backend (firma y borrado con el secreto)", () => {
    const usesCloudinarySecret = (file: string) =>
      /CLOUDINARY_API_SECRET|api\.cloudinary\.com/.test(read(file));
    expect([...frontendFiles, ...packageFiles].filter(usesCloudinarySecret).map(relative)).toEqual(
      [],
    );
    const backendUsers = backendFiles.filter(usesCloudinarySecret).map(relative);
    expect(backendUsers.every((file) => file.startsWith("apps/backend/src/lib/cloudinary/"))).toBe(
      true,
    );
  });

  it("Web3Forms se usa solo en el navegador, con la clave pública", () => {
    expect(
      backendFiles
        .filter((file) => /api\.web3forms\.com|WEB3FORMS_ACCESS_KEY/.test(read(file)))
        .map(relative),
    ).toEqual([]);
    expect(read(path.join(frontendSource, "lib/web3forms.ts"))).toContain(
      "NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY",
    );
  });

  it("Google Maps usa solo la clave pública y el backend no la conoce", () => {
    expect(backendFiles.filter((file) => /GOOGLE_MAPS/.test(read(file))).map(relative)).toEqual([]);
  });

  it("el único secreto en variables NEXT_PUBLIC_* es la clave pública de Web3Forms o de Maps", () => {
    const publicVariables = new Set(
      frontendFiles.flatMap((file) =>
        [...read(file).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)].map((match) => match[0]),
      ),
    );
    for (const name of publicVariables) {
      expect(name).not.toMatch(/SECRET|PASSWORD|TOKEN|DATABASE|CLOUDINARY_API/);
    }
  });

  it("el backend no usa variables NEXT_PUBLIC_*", () => {
    expect(backendFiles.filter((file) => /NEXT_PUBLIC_/.test(read(file))).map(relative)).toEqual(
      [],
    );
  });
});
