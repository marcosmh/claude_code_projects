# Portal Inmobiliario — SDD

Proyecto base para desarrollar un portal inmobiliario utilizando **Spec-Driven Development (SDD)** con Claude Code.

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

El frontend llama a `/api/**` de su propio origen y Next.js lo reenvía al backend
(`BACKEND_URL`), por lo que abriendo `http://localhost:3000/api/properties` se llega a la API.

## Documentos

### `CLAUDE.md`

Contiene las instrucciones permanentes que Claude Code debe seguir durante el desarrollo.

### `spec.md`

Define **qué debe hacer la aplicación**: funcionalidades, usuarios, propiedades, filtros, imágenes, ubicación, contacto, administración y criterios de aceptación.

### `plan.md`

Define **cómo se construirá técnicamente**: arquitectura, PostgreSQL, API REST, autenticación, Cloudinary, Google Maps, Web3Forms y separación de responsabilidades.

### `tasks.md`

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
