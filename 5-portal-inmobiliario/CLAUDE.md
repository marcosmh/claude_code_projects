# CLAUDE.md

## Instrucciones del proyecto

Este proyecto utiliza **Spec-Driven Development (SDD)**.

Antes de implementar cualquier funcionalidad, lee:

- `specs/portal-inmobiliario/spec.md`
- `specs/portal-inmobiliario/plan.md`
- `specs/portal-inmobiliario/tasks.md`

La especificación es la fuente de verdad del proyecto.

## Estado actual

- Pasos **1–19** de `tasks.md` completados: fundamentos, API REST pública, landing, catálogo con tarjetas, búsqueda, filtros, ordenamiento, detalle, galería, Google Maps, contacto con Web3Forms y API REST de registro/login (`/api/auth/*`) y autorización USER/ADMIN (`withRole`, `proxy.ts`) y cuenta de usuario (`/account`).
- Extras registrados fuera de la secuencia: **A** temas visuales (Claro, Oscuro, Smallville), **B** monorepo, **C** filtros en sidebar lateral colapsable y **D** interfaz de acceso (`/login`, `/register`, sesión en el header y cuentas de ejemplo del seed) y **E** edición de la cuenta (`PATCH /api/auth/me` y página `/account/edit`).
- Siguiente tarea pendiente: **Paso 20 — Favoritos**. No avanzar sin que el usuario lo pida.
- Cualquier mejora que no esté en `tasks.md` se registra primero en `spec.md`/`plan.md` y como "Extra" en `tasks.md`.

## Flujo de desarrollo

1. Lee la especificación y el plan técnico.
2. Revisa `tasks.md`.
3. Identifica la primera tarea pendiente.
4. Implementa únicamente esa tarea.
5. Ejecuta las validaciones y pruebas necesarias.
6. Corrige los errores antes de continuar.
7. Marca la tarea como completada en `tasks.md`.
8. No implementes tareas futuras salvo que el usuario lo solicite explícitamente.

## Reglas de arquitectura

- Antes de escribir código de Next.js, consulta la documentación de la versión instalada en `node_modules/next/dist/docs/` (ver `AGENTS.md`): esta versión tiene cambios incompatibles (`cacheComponents`, `params` asíncronos, etc.).
- Utiliza Next.js (version más reciente disponible) + React + TypeScript.
- Utiliza PostgreSQL como única base de datos de la aplicación.
- Utiliza API REST mediante Route Handlers de Next.js, que viven solo en `apps/backend`.
- El frontend consume la API únicamente a través de `@portal/api-client` y SWR, siempre contra `/api/**` de su propio origen (proxy `rewrites` hacia `BACKEND_URL`). Los contratos (DTOs y esquemas Zod) viven en `@portal/shared-types`.
- Persistencia con Prisma (`apps/backend/prisma`); las migraciones son la fuente del esquema.
- No utilices Server Actions.
- Los componentes del frontend no deben acceder directamente a la base de datos.
- Mantén separadas las responsabilidades de API, lógica de negocio y persistencia.
- Utiliza Cloudinary para las imágenes de las propiedades.
- Utiliza Google Maps para mostrar la ubicación de las propiedades.
- Utiliza Web3Forms para el formulario de contacto.
- No expongas secretos al navegador.
- Utiliza variables de entorno para credenciales y claves.

## Reglas de implementación

- Analiza el código existente antes de modificarlo.
- Prefiere cambios pequeños e incrementales.
- No agregues funcionalidades fuera de la tarea actual.
- Mantén TypeScript estricto y evita `any` salvo que sea realmente necesario.
- Valida los datos recibidos por el backend.
- Protege los recursos USER y ADMIN también en el backend.
- Utiliza respuestas REST y códigos HTTP consistentes.
- Mantén la aplicación responsive.
- Respeta la arquitectura existente.
- Los filtros, la búsqueda, el orden y la paginación del catálogo se representan en la URL (query params) y se resuelven en PostgreSQL, no en el navegador.
- La búsqueda y los filtros de ubicación ignoran mayúsculas y acentos (`unaccent` + `ILIKE`).
- Operación y tipo admiten varios valores separados por comas (`?operation=SALE,RENT`).
- Las respuestas de error de la API siguen el formato `{ message, status, details? }`.
- Los componentes de UI cumplen accesibilidad: etiquetas en controles, foco visible, jerarquía de títulos, `prefers-reduced-motion` y contraste AA en todos los temas.

## Regla de finalización

Una tarea solo está terminada cuando:

- su implementación está completa;
- el proyecto compila correctamente;
- las pruebas o validaciones correspondientes pasan;
- no quedan errores bloqueantes conocidos;
- la casilla correspondiente de `tasks.md` está marcada como completada.

## Protocolo SDD (ESTRICTO)
1. ANTES de modificar o crear cualquier código fuente, DEBES leer `specs/portal-inmobiliario/spec.md`.
2. No escribas código sin un plan aprobado en `specs/portal-inmobiliario/plan.md`.
3. Sigue tu progreso línea por línea en `specs/portal-inmobiliario/tasks.md`. Marca las tareas como [x] solo después de que las pruebas (tests) hayan pasado con éxito.

## Comandos de Construcción y Pruebas
El proyecto es un monorepo (pnpm Workspaces + Turborepo): `apps/frontend`, `apps/backend` y `packages/*` (ver `docs/architecture.md`).

- Instalar dependencias: `pnpm install` (pnpm 10 vía Corepack; la versión está fijada en `packageManager`)
- Ejecutar pruebas: `pnpm test`
- Ejecutar linter: `pnpm lint`
- Verificar tipos: `pnpm typecheck`
- Construir todo: `pnpm build`
- Servidores de desarrollo: `pnpm dev` (frontend :3000 y backend :4000), `pnpm dev:frontend`, `pnpm dev:backend`
- Base de datos (backend): `pnpm db:migrate`, `pnpm db:deploy`, `pnpm db:seed`, `pnpm db:seed:reset`, `pnpm db:studio`, `pnpm db:check`
- Las pruebas de integración del backend usan la base de `DATABASE_URL` y limpian lo que crean; no envían correos (Web3Forms se mockea).
- Formato: `pnpm format` (Prettier). `lint-staged` formatea lo que se commitea.
- Variables de entorno por aplicación: `apps/backend/.env.local`, `apps/frontend/.env.local` y `.env` en la raíz (solo pgAdmin). Hay un `.env.example` en cada una; los `.env` reales no se versionan.

## Estilo de Código y Arquitectura
- Seguir los principios de Arquitectura Limpia (Clean Architecture).
- Usar nombres de variables explícitos. No usar abreviaturas.
- Cada nueva funcionalidad debe tener su prueba unitaria correspondiente (Vitest + React Testing Library).
- Capas del backend: Route Handler → servicio (`createXService(dependencias)`) → repositorio → Prisma. La composición está en `apps/backend/src/services/services.ts`.

## Available Skills

| Skill | Path | Description |
|---|---|---|
| `react-rules` | `.claude/skills/react-rules/SKILL.md` | Estándares de desarrollo y reglas de arquitectura para proyectos y componentes de React con TypeScript, Tailwind CSS, Zustand, Zod, React Hook Form y React Query / SWR. |
| `vercel-react-best-practices` | `.claude/skills/vercel-react-best-practices/SKILL.md` | Optimización de rendimiento de React y Next.js (waterfalls, bundle, re-renders, SWR). |
| `web-design-guidelines` | `.claude/skills/web-design-guidelines/SKILL.md` | Revisión de UI según las Web Interface Guidelines (accesibilidad, formularios, tipografía, movimiento). |
| `prisma-cli`, `prisma-client-api`, `prisma-orm-setup` | `.claude/skills/prisma-*/SKILL.md` | Referencia de Prisma ORM: CLI, Client API y configuración. |

---

## Skill Trigger Rules

### `react-rules`
- **Activación**: Activar esta habilidad cuando el usuario pida:
  - Crear una nueva aplicación React o generar su estructura con TypeScript.
  - Crear, agregar o modificar componentes de React y maquetación con Tailwind CSS.
  - Diseñar e implementar Custom Hooks (`useAuth`, `useFetch`, etc.).
  - Gestionar estado global utilizando Zustand (`create()`).
  - Crear esquemas de validación de datos utilizando Zod (`z.object`, `z.string`, `parse`, `safeParse`).
  - Implementar formularios utilizando React Hook Form con resolver de Zod.
  - Implementar lógica de UI o fetching de APIs utilizando TanStack Query (React Query) o SWR.
  - Refactorizar código React para cumplir con principios de inmutabilidad, pureza y correcto uso de `useEffect`.

### `vercel-react-best-practices` y `web-design-guidelines`
- **Activación**: cuando el usuario pida optimizar rendimiento, revisar accesibilidad/UX o auditar la interfaz. Aplicar solo las reglas con efecto real en el proyecto y verificar los cambios en el navegador.
