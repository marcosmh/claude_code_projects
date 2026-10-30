# invoices-mcp

Servidor MCP (stdio) de **solo lectura** sobre las facturas. Se conecta directamente a PostgreSQL (Supabase) con `DATABASE_URL`, sin pasar por el MCP oficial de Supabase ni por el backend.

## Herramientas

| Tool | Entrada | Devuelve |
| --- | --- | --- |
| `get_invoice_summary` | `id` | Cliente, líneas (descripción, cantidad, precio unitario, subtotal por línea) y totales de la factura |
| `get_client_invoice` | `clientName` (parcial, sin distinguir mayúsculas), `limit` (1-200, 50 por defecto) | JSON completo de las facturas del cliente, las más recientes primero, con `count` y `truncated` |
| `get_summary_totals` | `currency` (opcional: `MXN`, `USD`, `EUR`) | Total emitidas, cobradas y por cobrar, **una entrada por moneda** |

- Importes en centavos enteros (`structuredContent`) y formateados (texto). Los totales no se guardan: se derivan con la misma regla que el backend (redondeo por línea y sobre el impuesto, mitades hacia arriba).
- **Emitidas** = enviadas + pagadas (los borradores no cuentan); **cobradas** = pagadas; **por cobrar** = enviadas. Nunca se suman monedas distintas.
- El nombre de la segunda tool es `get_client_invoice` (singular), aunque devuelve todas las facturas del cliente.

## Configuración

```bash
cp .env.example .env     # en apps/invoices-mcp/
```

- `DATABASE_URL` (obligatoria): la misma que usa el backend (Session pooler, puerto 5432). Se lee del `.env` de este paquete, sea cual sea el directorio desde el que se lance; una variable ya definida en el entorno tiene prioridad. Un `?schema=` al estilo Prisma se aplica como `search_path`.
- `INVOICES_OWNER_EMAIL` (opcional): limita **todas** las consultas a las facturas de ese usuario. Sin ella el servidor ve las de todos los usuarios (la conexión salta RLS), así que conviene definirla. Un email que no existe no devuelve nada.

## Uso

```bash
npm run build                  # desde apps/invoices-mcp/ (o npm run dev con tsx)
```

Registro en `.mcp.json` (desde `demo-claudecode/`, y reiniciando Claude Code):

```json
"invoices": { "command": "node", "args": ["apps/invoices-mcp/dist/index.js"] }
```

## Seguridad y diseño

- Cada consulta corre en una transacción `BEGIN READ ONLY` con `statement_timeout` de 10 s: el servidor de PostgreSQL rechaza cualquier escritura, diga lo que diga el SQL.
- Todo valor va como parámetro (`$n`); el texto del cliente escapa `%` y `_`. Nunca se imprime la URL ni la contraseña; los fallos de la base se registran por stderr (stdout es el protocolo) y al cliente solo le llega un mensaje genérico.
- Capas como en el backend: tools -> `InvoiceService` -> `InvoiceRepository` (`PgInvoiceRepository`, el único que toca SQL). Los nombres de columna son los de Prisma (`"clientName"`, `"InvoiceItem"`…): si cambia el esquema, cambia aquí.
- Pool de 2 conexiones, 5 s para conectar.

## Tests

`npm test`, `npm run test:coverage`, `npm run lint`, `npm run typecheck`. Los tests no usan base de datos: repositorio falso, pool falso (comprueban `READ ONLY`, parámetros y escape) y un cliente MCP en memoria.
