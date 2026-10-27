# Facturas

Aplicación web para crear, consultar, editar y eliminar facturas, con panel de estadísticas, exportación a PDF y acceso con usuario y contraseña. La interfaz está en español.

Es un **monorepo** (npm workspaces + Turborepo) con dos aplicaciones independientes, backend y frontend, y tres paquetes compartidos. Cada una tiene su propio `package.json`, scripts, variables de entorno, tests y despliegue.

## Tecnologías

| Parte | Stack |
| --- | --- |
| **Backend** (`apps/backend`) | Next.js 16 solo con route handlers (API REST), TypeScript, Prisma 7 + SQLite, Zod 4, JWT con `jose`, `@react-pdf/renderer` |
| **Frontend** (`apps/frontend`) | React 19, Vite 8, React Router, TanStack Query, Zustand, React Hook Form + Zod, Tailwind v4 |
| **Compartido** (`packages/`) | `shared-types`, `shared-utils`, `shared-validation` (TypeScript, sin paso de build) |
| **Herramientas** | Turborepo 2, Changesets, Vitest 5, Playwright + axe, ESLint, Docker, GitHub Actions. Node 22 |

## Funcionalidades

- **Acceso**: inicio y cierre de sesión, cambio de contraseña (cierra las demás sesiones) y bloqueo de la cuenta tras 5 intentos fallidos. Cada usuario ve solo sus facturas.
- **Facturas**
  - Líneas de detalle dinámicas (descripción, cantidad, precio unitario) con totales en vivo.
  - Impuesto configurable por factura y datos del cliente embebidos.
  - Estados: Borrador, Enviada y Pagada. "Vencida" no es un estado: se calcula como `Enviada` con fecha de vencimiento pasada.
  - Numeración `FAC-0001`, `FAC-0002`… que no se repite tras borrar.
  - Búsqueda, filtro por estado y paginación (los filtros viven en la URL).
- **Dashboard**: tarjetas de totales, gráfico por estado y gráfico de los últimos meses, con tooltips, teclado y vista en tabla.
- **PDF**: el detalle de cada factura genera el PDF.
- **Interfaz**: tema claro/oscuro, menú plegable y comprobación de accesibilidad automática (axe).

## Estructura

```
demo-claudecode/                 raíz del monorepo
├── apps/
│   ├── backend/                 API REST (src/, prisma/, tests/, docs/, Dockerfile)
│   └── frontend/                SPA (src/, e2e/, build/, deploy/, Dockerfile)
├── packages/
│   ├── shared-types/            tipos del contrato REST, estados y etiquetas
│   ├── shared-utils/            cálculo de totales y céntimos
│   └── shared-validation/       esquemas Zod y límites de entrada
├── docs/                        despliegue
├── resources/                   colecciones de la API (Postman y REST Client)
├── scripts/                     start_apps y stop_apps
├── .changeset/                  versionado independiente
├── docker-compose.yml           pila completa, mismo origen
├── turbo.json  package.json  tsconfig.base.json
└── legacy/                      app Next.js anterior, archivada (no se mantiene)
```

## Arranque en desarrollo

Requisitos: Node 22 o superior.

```bash
npm install                                  # una sola vez, en la raíz

cd apps/backend
cp .env.example .env                         # define JWT_SECRET (mínimo 32 bytes: openssl rand -base64 48)
npx prisma migrate deploy                    # aplica las migraciones
npm run user:create -- tu@correo.com         # no hay registro público; pide la contraseña (mínimo 12 caracteres)
npm run db:seed -- --force                   # opcional: facturas de ejemplo (BORRA todas las facturas)
cd ../..

bash scripts/start_apps                      # backend :4000 y frontend :5173, en segundo plano
bash scripts/stop_apps                       # las detiene
```

Abre http://localhost:5173. También puedes usar `npx turbo run dev` (primer plano) o `npm run dev` dentro de cada app. El frontend reenvía `/api` al backend (puerto 4000), así que el navegador habla con un solo origen.

## Scripts

Desde la raíz, con Turborepo (`--filter=@invoices/backend` o `@invoices/frontend` para una sola app):

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidores de desarrollo |
| `npm run build` | Build de todo |
| `npm run lint` | ESLint |
| `npm run typecheck` | Comprobación de tipos |
| `npm test` | Pruebas unitarias y de integración |
| `npm run test:e2e` | Playwright + axe (levanta su propio backend en 4100 con una base de datos desechable) |
| `npm run changeset` | Registra un cambio para el versionado |
| `npm run version-packages` | Aplica los changesets pendientes |

Cada app tiene además sus propios scripts (`test:coverage`, `db:migrate`, `db:seed`, `user:create`…); ver su `README.md`.

## Arquitectura

**Backend**: `route.ts` (solo enrutado) → `controllers` (petición y respuesta HTTP) → `services` (toda la lógica de negocio) → `repositories` (único acceso a Prisma). Todos los métodos del repositorio de facturas reciben `ownerId` primero y filtran por él: la factura de otro usuario es un 404. Contrato en `apps/backend/docs/api.md`.

**Frontend**: componentes → hooks → servicios → API REST. TanStack Query guarda los datos del servidor; Zustand, solo el estado global de interfaz. Las reglas de negocio (totales, vencimiento, numeración, agregados) las calcula el backend.

**Paquetes compartidos**: contrato REST, validación de entrada y regla del dinero (céntimos enteros, redondeo medio hacia arriba). La validación compartida solo es para la experiencia de usuario: el backend siempre revalida y nunca acepta del cliente `role`, `ownerId` ni totales. Un cambio en `shared-types` o `shared-validation` es un cambio de contrato.

## Autenticación y seguridad

- JWT en cookies `HttpOnly; SameSite=Strict`: token de acceso de 15 minutos y token de refresco rotatorio, firmados con **claves distintas**. Ninguno es legible desde JavaScript.
- Cerrar sesión, reutilizar un refresh o cambiar la contraseña en otro dispositivo revocan el token de acceso al instante.
- Protección CSRF: se exige un `Origin` permitido (o una petición del mismo origen) en toda escritura autenticada por cookie.
- Límite de peticiones, cabeceras de seguridad en la API y CSP completa en el frontend de producción.
- En producción el servidor **no arranca** sin `JWT_SECRET` y `JWT_REFRESH_SECRET` distintos y con entropía, ni sin `FRONTEND_ORIGIN` (origen https). La cookie de refresco se llama `__Secure-refresh`.

Detalle y decisiones en `apps/backend/docs/jwt-migration.md`.

## Base de datos

SQLite (`apps/backend/prisma/dev.db`). Modelos: `User`, `RefreshToken`, `Invoice` e `InvoiceItem` (en cascada). Los importes son enteros en céntimos y los totales nunca se almacenan. Los índices responden a las consultas reales (por propietario primero). PostgreSQL está aplazado a propósito.

## Pruebas

- Unitarias e integración con Vitest en el backend, el frontend y cada paquete, con umbrales de cobertura que no deben bajar.
- E2E con Playwright y accesibilidad con axe.
- Las colecciones de `resources/` (`postman/` se genera con `gen_postman.py`; `rest_client/` se escribe a mano) se validan con Newman y httpyac contra una base de datos temporal cuando cambia la API.

## CI/CD y despliegue

- GitHub Actions en `.github/workflows/`: `backend.yml`, `frontend.yml`, `packages.yml` y `e2e.yml`, con filtros por rutas. El `ci.yml` antiguo se conserva hasta que los nuevos pasen en verde.
- Backend y frontend se construyen en Docker por separado (`apps/*/Dockerfile`, con `turbo prune`). El diseño asume **mismo origen**: nginx sirve la SPA y reenvía `/api` al backend.
- `docker-compose.yml` levanta la pila completa para probar la integración.

Guía completa en [`docs/deployment.md`](docs/deployment.md).

## Estado

La migración a monorepo está hecha salvo la validación final: ejecutar los workflows en GitHub, probar las colecciones de la API con Newman/httpyac y comprobar el despliegue bajo https real. Pendiente a más largo plazo: PostgreSQL, rutas de administración, recuperación de contraseña, módulo de clientes y envío por email.
