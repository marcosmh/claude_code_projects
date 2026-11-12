# Portal Inmobiliario — SDD

Proyecto base para desarrollar un portal inmobiliario utilizando **Spec-Driven Development (SDD)** con Claude Code.

## Estado

Implementado (Pasos 1–17 de `specs/portal-inmobiliario/tasks.md`):

- API REST pública de propiedades, ubicaciones y consultas de contacto.
- Landing, catálogo con tarjetas, búsqueda, filtros (sidebar colapsable), ordenamiento y paginación.
- Detalle de propiedad con galería, mapa de Google Maps y formulario de contacto (guarda la consulta y envía el aviso por Web3Forms desde el navegador).
- Temas visuales: Claro, Oscuro y Smallville.
- API REST de autenticación: registro, login, logout y usuario actual, con contraseñas en scrypt y sesión en cookie httpOnly.
- Páginas `/login` y `/register`, y el header muestra «Ingresar» o el nombre con «Cerrar sesión» (Extra D).
- Autorización USER/ADMIN: `withRole` protege endpoints y `proxy.ts` protege `/account` y `/admin` (403 en `/forbidden`, redirección a `/login?next=…`).
- Página `/account` con información básica, enlace a `/account/edit` (edición de nombre, email y contraseña) y propiedades interesadas (tus favoritas) y consultadas (lista compacta de tus consultas, con opción de eliminar).
- Favoritos (Paso 20): corazón en las tarjetas y en el detalle, y contador de favoritas en el header (Extra F); un visitante que lo pulsa va a iniciar sesión y vuelve a la página.

Panel `/admin` con indicadores (Paso 22) y CRUD REST de propiedades solo para ADMIN (Paso 23).

Área de administración independiente (Extra L): `/admin/**` tiene su propio layout (sidebar colapsable, paleta corporativa, menú de módulos; los aún no construidos aparecen como «Próximamente») y no comparte el header ni el pie del portal. Un ADMIN solo usa el área de administración: `/account` lo redirige a `/admin`, favoritos y consultas propias responden 403 y su header no muestra cuenta ni favoritos.

Pendiente: **Paso 28 — Características** y el resto de la administración.

## Estructura

Monorepo con **pnpm Workspaces** y **Turborepo**. Más detalle en [docs/architecture.md](docs/architecture.md).

```text
.
├── apps/
│   ├── frontend/        Next.js: interfaz (puerto 3000)
│   └── backend/         Next.js: API REST + Prisma + PostgreSQL (puerto 4000)
├── packages/
│   ├── shared-types/    DTOs y contratos de la API
│   ├── api-client/      Cliente REST tipado
│   └── eslint-config/   Configuración ESLint compartida
├── docs/                Documentación técnica
├── specs/               Especificación SDD (spec, plan, tasks)
├── resources/           Colecciones Postman y REST Client
├── docker-compose.yml   pgAdmin para desarrollo
└── CLAUDE.md
```

## Puesta en marcha

Requisitos: Node.js 20+, pnpm 10 (`corepack enable`) y PostgreSQL.

```bash
pnpm install
```

Copia las variables de entorno y complétalas:

```bash
cp apps/backend/.env.example apps/backend/.env.local
cp apps/frontend/.env.example apps/frontend/.env.local
cp .env.example .env
```

Migraciones y datos de ejemplo:

```bash
pnpm db:migrate
pnpm db:seed
```

| Comando              | Acción                                      |
| -------------------- | ------------------------------------------- |
| `pnpm dev`           | Levanta frontend (:3000) y backend (:4000)  |
| `pnpm dev:frontend`  | Solo el frontend                            |
| `pnpm dev:backend`   | Solo el backend                             |
| `pnpm build`         | Construye todas las aplicaciones            |
| `pnpm test`          | Pruebas de todos los paquetes (Vitest)      |
| `pnpm lint`          | ESLint en todo el monorepo                  |
| `pnpm typecheck`     | TypeScript en todo el monorepo              |
| `pnpm format`        | Prettier sobre el repositorio               |
| `pnpm db:migrate`    | Crea/aplica migraciones (desarrollo)        |
| `pnpm db:deploy`     | Aplica migraciones existentes               |
| `pnpm db:seed`       | Carga datos de ejemplo                      |
| `pnpm db:seed:reset` | Reinicia y vuelve a cargar los datos        |
| `pnpm db:studio`     | Prisma Studio                               |
| `pnpm db:check`      | Verifica la conexión a la base              |

El frontend llama a `/api/**` de su propio origen y Next.js lo reenvía al backend
(`BACKEND_URL`), por lo que abriendo `http://localhost:3000/api/properties` se llega a la API.

Para ver pgAdmin en desarrollo: `docker compose up -d` (puerto 5050; credenciales en el `.env` de la raíz).

## Variables de entorno

| Archivo | Variable | Uso |
| --- | --- | --- |
| `apps/backend/.env.local` | `DATABASE_URL` | Conexión a PostgreSQL |
| | `AUTH_SECRET` | Firma de sesiones (mínimo 32 caracteres; p. ej. `openssl rand -base64 32`) |
| | `CLOUDINARY_*` | Imágenes de propiedades |
| `apps/frontend/.env.local` | `BACKEND_URL` | Destino del proxy `/api/**` |
| | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Mapa del detalle |
| | `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` | Clave de Web3Forms para el aviso por correo de las consultas (se envía desde el navegador; el plan gratuito rechaza envíos desde servidores) |
| | `NEXT_PUBLIC_APP_URL` | URL pública de la aplicación |
| `.env` (raíz) | `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD` | Solo pgAdmin |

Los archivos `.env*` reales no se versionan; usa los `.env.example`.

## Cuentas de ejemplo

`pnpm db:seed` crea (o restablece) estas cuentas, también si ya hay propiedades cargadas. Solo para desarrollo:

| Email | Contraseña | Rol | Estado |
| --- | --- | --- | --- |
| `admin@portal.mx` | `Admin1234!` | ADMIN | activa |
| `usuario@portal.mx` | `Usuario1234!` | USER | activa |
| `inactivo@portal.mx` | `Inactivo1234!` | USER | desactivada (el login responde 403) |

Sirven en `/login`, en `resources/postman/postman-api.json` y en `resources/rest-client/rest-client.http`.

## API REST

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/properties` | Listado paginado de propiedades publicadas (filtros: `operation`, `type`, `availability`=AVAILABLE,SOLD,RENTED, `publishedFrom`/`publishedTo`=AAAA-MM-DD, precio, dormitorios, baños, ubicación…) |
| GET | `/api/properties/{id}` | Detalle con imágenes y características |
| GET | `/api/locations` | Ciudades y regiones disponibles |
| POST | `/api/inquiries` | Registra una consulta en PostgreSQL (asociada al usuario si hay sesión); el correo lo envía el navegador con Web3Forms |
| GET | `/api/inquiries/mine` | Consultas de la sesión, paginadas de 6 en 6 (`page`, `pageSize`, `q` busca en título o mensaje) (200; 400; 401) |
| DELETE | `/api/inquiries/{id}` | Elimina una consulta propia (204; 401; 404) |
| POST | `/api/auth/register` | Crea una cuenta USER e inicia sesión (201; 409 si el email existe) |
| POST | `/api/auth/login` | Inicia sesión (200; 401 credenciales incorrectas; 403 cuenta desactivada) |
| POST | `/api/auth/logout` | Cierra la sesión borrando la cookie (204) |
| GET | `/api/auth/me` | Usuario de la sesión actual (200; 401 sin sesión válida) |
| GET | `/api/admin/dashboard` | Indicadores del panel (solo ADMIN: 200; 401; 403) |
| GET | `/api/admin/properties` | Lista paginada con borradores (`page`, `pageSize`, `search`, `status`=all/published/draft y los filtros `operation`, `type`, `availability`, `minPrice`, `maxPrice`, `publishedFrom`, `publishedTo`) (solo ADMIN) |
| POST | `/api/admin/properties` | Crea una propiedad (201; 400; solo ADMIN) |
| POST | `/api/admin/properties/{id}/images` | Sube una imagen (`multipart/form-data`, campo `file`; JPEG/PNG/WebP hasta 5 MB) a Cloudinary (carpeta `propiedades-claude`) y guarda URL y `publicId` (201; 400/404/413/415; 502/503; solo ADMIN) |
| PUT | `/api/admin/properties/{id}/images` | Reordena las imágenes (`{ "imageIds": [...] }`, todas las de la propiedad; 200/400/404; solo ADMIN) |
| PATCH | `/api/admin/properties/{id}/images/{imageId}` | Marca la imagen como principal (`{ "isPrimary": true }`; 200/400/404; solo ADMIN) |
| DELETE | `/api/admin/properties/{id}/images/{imageId}` | Elimina la imagen de Cloudinary y de PostgreSQL (204; 404; 502; solo ADMIN) |
| GET | `/api/admin/properties/{id}` | Propiedad en cualquier estado (200; 404; solo ADMIN) |
| PUT | `/api/admin/properties/{id}` | Reemplaza los campos editables (200; 400; 404; solo ADMIN) |
| DELETE | `/api/admin/properties/{id}` | Borrado lógico: marca `deletedAt`, despublica y oculta la propiedad sin borrar filas (204; 404; solo ADMIN) |
| PATCH | `/api/auth/me` | Actualiza nombre, email y contraseña propios (200; 400, 401, 403 sin contraseña actual, 409 email repetido) |
| GET | `/api/favorites` | Favoritas de la sesión (200; 401) |
| PUT | `/api/favorites/{propertyId}` | Guarda una propiedad sin duplicar (200; 401; 404) |
| DELETE | `/api/favorites/{propertyId}` | Quita una propiedad de favoritos (204; 401) |

Parámetros de `GET /api/properties`:

| Parámetro | Descripción |
| --- | --- |
| `page`, `pageSize` | Paginación (12 por página por defecto, máximo 50) |
| `search` | Texto libre, sin distinguir mayúsculas ni acentos |
| `operation`, `type` | Uno o varios valores separados por comas (`SALE,RENT`) |
| `commune`, `city`, `region` | Coincidencia parcial sin acentos |
| `minPrice`, `maxPrice` | Rango de precio |
| `bedrooms`, `bathrooms` | "Al menos" N |
| `minUsableArea` | Superficie útil mínima |
| `featured` | `true`/`false` |
| `sort` | `newest` (defecto), `price_asc`, `price_desc`, `area_asc`, `area_desc` |

Los errores devuelven `{ message, status, details? }`. Las colecciones de `resources/` aún no cubren `/api/locations`, `/api/inquiries` ni los filtros nuevos.

## Pruebas

`pnpm test` ejecuta Vitest en todos los paquetes. Las pruebas de integración del backend usan la base de `DATABASE_URL` y limpian lo que crean; el correo se envía desde el navegador, así que las pruebas nunca envían correos.

## Documentos

### `CLAUDE.md` y `AGENTS.md`

Instrucciones permanentes para Claude Code y otros agentes. `AGENTS.md` incluye además el bloque generado por Next.js (no editar entre sus marcas).

### `specs/portal-inmobiliario/spec.md`

Define **qué debe hacer la aplicación**: funcionalidades, usuarios, propiedades, filtros, imágenes, ubicación, contacto, administración y criterios de aceptación.

### `specs/portal-inmobiliario/plan.md`

Define **cómo se construirá técnicamente**: arquitectura, PostgreSQL, API REST, autenticación, Cloudinary, Google Maps, Web3Forms y separación de responsabilidades.

### `specs/portal-inmobiliario/tasks.md`

Divide la implementación en una secuencia incremental de tareas.

## Comenzar con Claude Code

Abre Claude Code desde la raíz del repositorio y utiliza:

```text
Lee CLAUDE.md y todos los documentos del directorio
specs/portal-inmobiliario/.

Analiza la especificación, el plan técnico y la lista de tareas.

Comienza únicamente con la primera tarea pendiente de tasks.md.
No avances a la siguiente tarea hasta que te lo indique.
```

Para continuar posteriormente:

```text
Continúa con la siguiente tarea pendiente de tasks.md.

Consulta spec.md y plan.md cuando sea necesario.
Implementa únicamente esa tarea, valida los cambios y márcala
como completada cuando esté correctamente terminada.

No avances a la siguiente tarea.
```
