<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Portal Inmobiliario — guía para agentes

Proyecto de **Spec-Driven Development**. Las instrucciones completas están en `CLAUDE.md`; la fuente de verdad es `specs/portal-inmobiliario/` (`spec.md`, `plan.md`, `tasks.md`).

### Flujo de trabajo

1. Lee `spec.md` y `plan.md` y localiza la tarea en `tasks.md`.
2. Implementa **solo** esa tarea (o la que el usuario pida) con cambios pequeños e incrementales.
3. Valida con `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`.
4. Marca la tarea `[x]` en `tasks.md` solo cuando todo pase.
5. Lo que no esté en `tasks.md` se registra antes en spec/plan y como "Extra".

### Mapa del repositorio

| Ruta | Contenido |
| --- | --- |
| `apps/frontend` | Next.js (:3000): UI, SWR, Zustand (tema), React Hook Form + Zod. Sin acceso a la base. |
| `apps/backend` | Next.js (:4000): Route Handlers `/api/**`, servicios, repositorios, Prisma, migraciones y seed. |
| `packages/shared-types` | DTOs y esquemas Zod de entrada (contrato de la API). |
| `packages/api-client` | Cliente REST tipado que usa el frontend. |
| `packages/eslint-config` | Configuración ESLint compartida. |
| `resources/` | Colecciones Postman y REST Client. |
| `docs/architecture.md` | Arquitectura y decisiones del monorepo. |

### Convenciones importantes

- Sin Server Actions: toda la comunicación es REST. El frontend llama a `/api/**` de su origen y Next lo reenvía al backend (`BACKEND_URL`, evaluada al construir).
- Backend por capas: Route Handler → servicio → repositorio → Prisma; composición en `apps/backend/src/services/services.ts`.
- Catálogo: búsqueda, filtros, orden y página viven en la URL. `operation` y `type` aceptan listas separadas por comas. Búsqueda y ubicación ignoran acentos y mayúsculas.
- Errores de la API: `{ message, status, details? }`.
- Los secretos (`DATABASE_URL`, `WEB3FORMS_ACCESS_KEY`, Cloudinary) existen solo en `apps/backend/.env.local`; nunca en el navegador. No leas ni imprimas archivos `.env*`.
- Pruebas: Vitest. Las de integración del backend usan la base real y limpian sus datos; Web3Forms se mockea.
- Si Prettier reformatea archivos que no tocaste, restáuralos con `git checkout -- <archivo>`; no mezcles ruido de formato en un cambio.
- Al terminar de probar en el navegador, deja los puertos 3000/4000 como los encontraste o avisa de que siguen en uso.

