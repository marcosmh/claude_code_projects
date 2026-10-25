# Frontend de facturas

React 19 + TypeScript + Vite + React Router + Tailwind v4. Consume la API REST de `../backend` (contrato en `../backend/docs/api.md`). Toda la interfaz está en español.

## Comandos

```bash
npm install
cp .env.example .env     # opcional: VITE_API_URL (por defecto http://localhost:4000/api/v1)
npm run dev              # http://localhost:5173 (el backend debe estar en el puerto 4000)
npm run build            # tsc --noEmit + vite build (salida en dist/)
npm run preview          # sirve dist/ en el puerto 5173
npm run lint
npm test                 # vitest + Testing Library (jsdom)
npm run test:coverage    # igual, con umbrales de cobertura
npm run test:e2e         # Playwright + axe en un navegador real (ver "Pruebas E2E")
```

El backend permite por CORS el origen `http://localhost:5173` (variable `FRONTEND_ORIGIN` del backend).

## Arquitectura

Flujo obligatorio: **componentes -> hooks -> services -> API REST**.

```
src/
  components/
    common/    presentación reutilizable (PageHeader, Panel, StatCard, StatusBadge, Skeleton, Toast...)
    layout/    AppShell, TopBar, Sidebar, ThemeToggle
    features/  invoices/ (formulario, tabla, filtros, paginación, diálogo de borrado) y dashboard/ (gráficos SVG)
  pages/       una por ruta; componen hooks y componentes
  hooks/       useInvoices, useInvoice, useInvoiceMutations, useStats, useInvoiceFilters (URL)
  services/    apiClient (fetch tipado, ApiError, envoltura {data, meta}), invoicesService, statsService
  store/       Zustand: uiStore (tema, menú) y toastStore (avisos flash)
  types/       contrato de la API
  utils/       formato, etiquetas/colores de estado, esquema Zod del formulario, vista previa de totales
```

Decisiones:

- **TanStack Query** para datos de servidor (caché compartida entre lista, filtros y dashboard, cancelación con `AbortSignal`, refresco tras mutaciones).
- **Zustand** solo para estado de UI global (tema, menú colapsado, avisos).
- **React Hook Form + Zod**: Zod valida forma y formato con mensajes en español y transforma los textos al cuerpo de la API (centavos). Los errores 400/422 del servidor se asignan al campo cuando `details[].field` existe (`items.N.unitPriceCents` se mapea a `items.N.price`); el resto va en un aviso general.
- **Reglas de negocio en el backend**: totales, `isOverdue`, número de factura, agregados del dashboard y estados válidos vienen de la API. Única excepción: `utils/totalsPreview.ts`, vista previa informativa dentro del formulario.
- **Avisos flash**: `toastStore` + `ToastViewport` montado en `AppShell`, así sobreviven a la navegación. Se cierran a los 5 s, se pausan con hover/foco y tienen botón de cierre (`role="status"` / `role="alert"`).
- **URL como estado de filtros**: `/invoices?status=SENT&q=acme&page=2`.
- **Tema**: clase `dark` en `<html>` aplicada por un script inline de `index.html` antes del primer pintado (oscuro por defecto salvo `localStorage.theme === "light"`). `src/globals.css` remapea la paleta zinc en `:root.dark`.
- Las páginas se cargan con `lazy` de React Router (un chunk por ruta).

## Rutas

`/` -> `/dashboard`, `/dashboard`, `/invoices`, `/invoices/new`, `/invoices/:id`, `/invoices/:id/edit`, y 404 para el resto. Un error boundary cubre los fallos de render.

## Pruebas

Cliente HTTP (ApiError, envoltura, red, abort), hook `useInvoices`, formulario (validación, cuerpo enviado, errores del servidor), avisos (roles, 5 s, pausa, cierre) y mapeo de errores del servidor.

## Pruebas E2E y accesibilidad

`e2e/` contiene pruebas con Playwright (Chromium) y `@axe-core/playwright` (reglas WCAG 2.0 a 2.2 nivel AA) sobre la aplicación real: flujos completos (crear, editar, cambiar estado, borrar con diálogo, buscar y filtrar, PDF, tema, menú, foco y teclado) y un barrido de axe en cada pantalla, en tema claro y oscuro, con el formulario con errores, el diálogo abierto y la vista móvil.

Cada prueba arranca con la sesión iniciada (fixture automática en `e2e/fixtures.ts` con la cuenta desechable `e2e@example.com`, que el arranque crea en `e2e.db`); `e2e/auth.spec.ts` usa el `test` de Playwright sin sesión para probar el login, la redirección y el cierre de sesión.

`npm run test:e2e` levanta su **propia pila**, aislada de `start_apps` y de `prisma/dev.db`: backend en el puerto 4100 con la base `backend/prisma/e2e.db` (se recrea en cada ejecución), build en `.next-e2e` y rate limiting desactivado (`RATE_LIMIT_DISABLED=1`, ignorado con `NODE_ENV=production`), y frontend en el puerto 5174. Cada prueba parte de una base vacía y crea sus datos por la API.

Primera vez: `npx playwright install chromium` (en Linux sin dependencias del sistema, `npx playwright install --with-deps chromium`). Informe tras un fallo: `npm run test:e2e:report`.

## Sesión

La API usa una cookie `httpOnly`, así que el JavaScript de la app nunca ve el token. `apiClient` envía `credentials: "include"`; el estado de sesión es una consulta de TanStack Query (`useSession`, clave `queryKeys.session`) cuyo valor es el usuario o `null`. `RequireAuth` protege todas las rutas salvo `/login` y recuerda la ruta pedida para volver tras entrar. Cualquier 401 fuera de `/auth/*` (sesión caducada o revocada) ejecuta el manejador registrado en `main.tsx`: descarta los datos en caché y la app vuelve a `/login` sin recargar. Al iniciar o cerrar sesión se descarta también la caché, para que ningún dato de una cuenta se vea desde otra. No hay pantalla de registro: las cuentas se crean con `npm run user:create` en el backend.
