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
