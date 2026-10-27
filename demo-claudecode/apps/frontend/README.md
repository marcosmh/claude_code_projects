# Frontend de facturas

React 19 + TypeScript + Vite + React Router + Tailwind v4. Consume la API REST de `../backend` (contrato en `../backend/docs/api.md`). Toda la interfaz está en español.

## Comandos

```bash
npm install
cp .env.example .env     # opcional: VITE_API_URL (por defecto http://localhost:4000/api/v1; `/api/v1` usa el proxy de Vite hacia VITE_PROXY_TARGET, por defecto http://localhost:4000)
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
  hooks/       useAuth (sesión, login, logout, contraseña), useInvoices, useInvoice, useInvoiceMutations, useInvoicePdf, useStats, useInvoiceFilters (URL)
  services/    apiClient (fetch tipado, ApiError, envoltura {data, meta}, cookies httpOnly + refresh single-flight), sessionFlags, authService, invoicesService, statsService
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

Cliente HTTP (ApiError, envoltura, red, abort, `credentials: include` sin `Authorization`, refresh single-flight y entre pestañas, reintento único, fallo -> manejador de 401, almacenamiento no disponible), `authService` (login, logout, cambio de contraseña, recuperación de sesión), `useSession` con `role`, hook `useInvoices`, formulario (validación, cuerpo enviado, errores del servidor), avisos (roles, 5 s, pausa, cierre) y mapeo de errores del servidor.

## Pruebas E2E y accesibilidad

`e2e/` contiene pruebas con Playwright (Chromium) y `@axe-core/playwright` (reglas WCAG 2.0 a 2.2 nivel AA) sobre la aplicación real: flujos completos (crear, editar, cambiar estado, borrar con diálogo, buscar y filtrar, PDF, tema, menú, foco y teclado) y un barrido de axe en cada pantalla, en tema claro y oscuro, con el formulario con errores, el diálogo abierto y la vista móvil.

Cada prueba arranca con la sesión iniciada (fixture automática en `e2e/fixtures.ts` con la cuenta desechable `e2e@example.com`, que el arranque crea en `e2e.db`): el login por API deja las cookies del access y del refresh en el navegador y el cliente `api` usa el access token del cuerpo en `Authorization` (el backend del e2e corre con `AUTH_COOKIE_ACCESS=1`; Vite sirve `/api` por proxy hacia él, como en producción). `e2e/auth.spec.ts` incluye la renovación transparente (sin token guardado y con token caducado); `e2e/auth.spec.ts` usa el `test` de Playwright sin sesión para probar el login, la redirección y el cierre de sesión.

`npm run test:e2e` levanta su **propia pila**, aislada de `start_apps` y de `prisma/dev.db`: backend en el puerto 4100 con la base `backend/prisma/e2e.db` (se recrea en cada ejecución), build en `.next-e2e` y rate limiting desactivado (`RATE_LIMIT_DISABLED=1`, ignorado con `NODE_ENV=production`), y frontend en el puerto 5174. Cada prueba parte de una base vacía y crea sus datos por la API.

Primera vez: `npx playwright install chromium` (en Linux sin dependencias del sistema, `npx playwright install --with-deps chromium`). Informe tras un fallo: `npm run test:e2e:report`.

## Sesión (JWT en cookies httpOnly)

Decisión 6 de `backend/docs/jwt-migration.md`: ningún token pasa por el JavaScript de la página. Requiere el backend con `AUTH_COOKIE_ACCESS=1` y, en desarrollo, `VITE_API_URL=/api/v1` (Vite reenvía `/api` al backend: `VITE_PROXY_TARGET`, por defecto `http://localhost:4000`).

- **Access token** (JWT de vida corta, 15 min) y **refresh token** (7 días): ambos en cookies `httpOnly` (`SameSite=Strict`) que fija el servidor en `POST /auth/login` y `POST /auth/refresh`; el cuerpo solo trae el `user`. El cliente no los lee ni los envía a mano: **todas** las peticiones van con `credentials: "include"` y sin `Authorization`.
- **Renovación** (`apiClient`): ante un 401 fuera de `/auth/*`, un único intento de `/auth/refresh` con *single-flight* (las peticiones concurrentes comparten una sola petición; es imprescindible porque el refresh rota y reutilizar uno viejo revoca la sesión) y reintento único de la petición original. Entre pestañas se serializa con `navigator.locks`; como ya no hay un token que comparar, `sessionFlags` guarda el instante de la última renovación (`refreshedAt`, no sensible): si es posterior al envío de la petición que dio 401, otra pestaña ya renovó y solo se repite la petición. Si el refresh falla con 401, se llama al manejador de `main.tsx` (limpia la caché y lleva a `/login`); red, 5xx o 429 se propagan sin cerrar la sesión.
- **Carga de la app**: `useSession` (clave `queryKeys.session`, valor = `{ id, email, role }` o `null`) llama a `/auth/me`; si da 401 recupera la sesión con `/auth/refresh` antes de darla por perdida. `RequireAuth` protege todas las rutas salvo `/login`.
- **Login** no guarda nada en el navegador; **logout** llama al backend (revoca la sesión y borra las cookies) y ante un fallo de red o 5xx reintenta una vez (un 4xx, incluido 429, no). Si el servidor sigue sin revocar la sesión, las cookies siguen vivas (el JavaScript no puede borrarlas), así que `markLoggedOutLocally` guarda la marca `loggedOut` en `localStorage` (`sessionFlags.ts`, con respaldo en memoria) y `authService.me` devuelve `null` sin llamar a `/auth/refresh` mientras esté puesta: recargar no recupera la sesión y hay que iniciar sesión de nuevo. `login` y un logout correcto limpian la marca. Si el logout sí llegó al servidor aunque la respuesta se perdiera (p. ej. se cerró la pestaña), el access token ya no vale (`sid`); si nunca llegó, la sesión sigue viva en el servidor. **Cambio de contraseña**: el backend invalida el access token actual, por eso `authService.changePassword` llama después a `/auth/refresh` (la cookie de este dispositivo sigue válida) y el servidor cierra las demás sesiones.
- Al arrancar, `main.tsx` borra del `localStorage` el `accessToken` que guardaban versiones anteriores.
- El PDF de una factura se descarga con `fetch` y las cookies (`requestBlob`) y se abre en una pestaña nueva desde un blob (`useInvoicePdf`).
- El login muestra tal cual el mensaje del servidor (el mismo para cuenta inexistente, contraseña errónea y cuenta bloqueada). Al iniciar o cerrar sesión se descarta la caché de datos. No hay pantalla de registro: las cuentas se crean con `npm run user:create` en el backend.

### Seguridad de la sesión y CSP

Los tokens no son legibles por scripts, pero un XSS activo seguiría pudiendo actuar como el usuario mientras la pestaña esté abierta (las cookies viajan solas). Mitigaciones:

- El código no usa `dangerouslySetInnerHTML` ni scripts de terceros (comprobado con `grep`; mantenerlo así).
- **CSP estricta**, definida en `vite.config.ts` (`buildCsp`): `script-src 'self'` (sin `unsafe-inline`), `style-src 'self'` (más `style-src-attr 'unsafe-inline'` para los atributos `style` de los gráficos), `connect-src 'self'` + el origen de `VITE_API_URL` (si es relativa, p. ej. `/api/v1`, solo `'self'`), `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`. El script del tema, antes inline, es ahora `public/theme-init.js` (archivo externo, sin hash que mantener).
  - **Build**: se inyecta como `<meta http-equiv="Content-Security-Policy">` en `dist/index.html`. `npm run preview` la envía además como cabecera. Un `<meta>` no admite `frame-ancestors`.
  - **Desarrollo**: sin CSP (Vite necesita scripts inline para HMR).
  - **Producción**: el hosting debe enviar la misma política como cabecera `Content-Security-Policy` (para que `frame-ancestors` funcione), con `connect-src` apuntando al origen real de la API. Valor para el build por defecto: `default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' http://localhost:4000; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'` (cambia `http://localhost:4000`). Si se añade un script o recurso externo, hay que ampliarla a propósito.
- Access token de vida corta y claims mínimos (backend).

## Tema, moneda y avisos

- **Tema**: una elección guardada (interruptor) manda; sin ella, `index.html` aplica antes del primer pintado la preferencia del sistema (`prefers-color-scheme`) y, si no se puede saber, oscuro. Solo se lee al cargar: cambiar el tema del sistema con la app abierta no la actualiza.
- **Moneda**: USD por defecto; `VITE_CURRENCY` (código ISO 4217, p. ej. `MXN`) la cambia. Solo afecta a la presentación: el backend trabaja en centavos sin moneda.
- **Avisos (toasts)**: máximo 3 a la vez (al llegar otro se descarta el más antiguo). Viven en dos regiones en vivo siempre presentes (`status` para éxito, `alert` para error) para que los lectores de pantalla los anuncien.
