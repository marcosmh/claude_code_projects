# Arquitectura

Monorepo con **pnpm Workspaces** y **Turborepo**. Dos aplicaciones Next.js independientes y paquetes compartidos.

```text
apps/
  frontend/   :3000  Interfaz, estado, formularios. Sin acceso a PostgreSQL.
  backend/    :4000  Route Handlers /api/**, servicios, repositorios, Prisma.
packages/
  shared-types/   DTOs y contratos de la API (tipos + esquemas Zod de entrada).
  api-client/     Cliente REST tipado que usa el frontend.
  eslint-config/  Configuración ESLint compartida (base y next).
```

## Comunicación frontend → backend

El navegador llama siempre a `/api/**` del **frontend** (mismo origen). `rewrites` en
`apps/frontend/next.config.ts` reenvía la petición a `BACKEND_URL`.

```text
Navegador ──/api/properties──▶ frontend :3000 ──rewrite──▶ backend :4000 ──▶ PostgreSQL
```

Ventajas: sin CORS, y las cookies de sesión (Paso 17) funcionan sin configuración cross-site.
`BACKEND_URL` se evalúa **al construir** el frontend: debe estar definida en el entorno de build.

## Capas del backend

Route Handlers → servicios → repositorios → PostgreSQL (Prisma). Los componentes React nunca acceden a la base de datos.

## Código compartido

Los paquetes `@portal/*` son paquetes internos TypeScript (sin paso de build): cada app los
compila con `transpilePackages`. Una regla simple: lo que define el **contrato** de la API
(tipos, validación de entrada) vive en `shared-types`; lo que solo usa una app, en esa app.

## Variables de entorno

| Archivo                     | Contenido                                             |
| --------------------------- | ----------------------------------------------------- |
| `apps/backend/.env.local`   | `DATABASE_URL`, `AUTH_SECRET`, Cloudinary             |
| `apps/frontend/.env.local`  | `BACKEND_URL`, `NEXT_PUBLIC_*` (Google Maps, app URL) |
| `.env` (raíz)               | Solo `PGADMIN_*` para `docker compose`                |

Cada app trae su `.env.example`. Solo las variables `NEXT_PUBLIC_*` llegan al navegador.

## Añadir un servicio o paquete

1. Crear `apps/<nombre>` o `packages/<nombre>` con su `package.json`.
2. `pnpm install` lo registra automáticamente (`pnpm-workspace.yaml`).
3. Definir los scripts `dev`, `build`, `lint`, `typecheck` y `test`: Turborepo los orquesta.
