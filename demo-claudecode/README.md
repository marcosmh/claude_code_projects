# Facturas

Aplicación web para crear, consultar, editar y eliminar facturas, con un panel de estadísticas y exportación a PDF. La interfaz está en español.

## Tecnologías

- **Next.js 16.4** (App Router, `cacheComponents`) y **React 19.3**, en TypeScript 5
- **Tailwind CSS v4**
- **Prisma 7.10** con SQLite (adaptador `better-sqlite3`)
- **Zod 4** para validación y **React Hook Form** para el formulario de facturas
- **@react-pdf/renderer 4.9** para generar PDF
- **Vitest 5** y ESLint

## Funcionalidades

- **CRUD de facturas**
  - Líneas de detalle dinámicas (descripción, cantidad, precio unitario) con totales en vivo.
  - Impuesto configurable por factura.
  - Datos del cliente embebidos en la factura.
  - Estados: Borrador, Enviada y Pagada.
  - Numeración secuencial `FAC-0001`, `FAC-0002`… que no se repite tras borrar.
- **Dashboard**
  - Tarjetas: facturas, cobrado, por cobrar (con las vencidas) y borradores.
  - Gráfico de estados y gráfico de totales de los últimos 6 meses, con tooltips y vista en tabla.
- **PDF**: el botón "Ver PDF" del detalle abre la factura en una pestaña nueva.
- **Interfaz**: menú lateral (Dashboard y Facturas), barra superior con botón ☰ para ocultar el menú, y tema claro/oscuro. Ambas preferencias se recuerdan.

## Arranque

```bash
npm install
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npx prisma migrate dev        # crea la base de datos
npm run db:seed               # facturas de ejemplo (borra las existentes)
npm run dev                   # http://localhost:3000
```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (también comprueba tipos) |
| `npm run lint` | Análisis con ESLint |
| `npm test` | Pruebas con Vitest |
| `npm run db:seed` | Carga datos de ejemplo. **Borra todas las facturas** |

## Estructura

```
app/            páginas y rutas
  dashboard/    panel con gráficos
  invoices/     listado, nueva, detalle, edición y [id]/pdf (genera el PDF)
components/     InvoiceForm (+ invoice-form/), Sidebar, TopBar, ThemeToggle, StatusBadge, DeleteButton
  charts/       StatusBar, MonthlyColumns, DataTable
  pdf/          InvoiceDocument
hooks/          useHtmlClass (tema y menú)
lib/            totals, stats, validators, format, prisma
  actions/      Server Actions de facturas
prisma/         schema, migraciones y seed
tests/          pruebas de totals, stats y validators
```

## Arquitectura

No hay API REST. Las páginas leen la base de datos directamente con Prisma y las modificaciones pasan por Server Actions (`lib/actions/invoices.ts`), que validan con Zod. La única ruta aparte es `app/invoices/[id]/pdf/route.ts`.

- `lib/totals.ts`: calcula subtotal, impuesto y total. Lo comparten listado, detalle, formulario, dashboard y PDF.
- `lib/stats.ts`: agrupa por estado, detecta vencidas y suma por mes.
- `components/InvoiceForm.tsx`: formulario de creación y edición.
- `components/pdf/InvoiceDocument.tsx`: diseño del PDF.

## Base de datos

SQLite en `dev.db`, en la raíz del proyecto.

- **`Invoice`**: número (único), cliente (nombre, email y dirección opcionales), fechas de emisión y vencimiento, estado, porcentaje de impuesto y notas.
- **`InvoiceItem`**: descripción, cantidad y precio unitario en centavos. Pertenece a una factura y se elimina con ella (cascada).

Una factura tiene muchas líneas. Los importes se guardan como enteros en centavos y los totales nunca se almacenan. "Vencida" no es un estado: se calcula como `Enviada` con fecha de vencimiento pasada.

## Pendiente

Módulo de clientes, PostgreSQL, filtros, autenticación, envío por email y datos de la empresa o logo en el PDF.
