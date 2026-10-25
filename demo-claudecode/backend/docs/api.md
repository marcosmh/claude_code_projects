# API REST de facturas, v1

Base URL por defecto: `http://localhost:4000/api/v1`. Todas las respuestas JSON usan `Content-Type: application/json` (salvo PDF y 204).

## Convenciones

- **Dinero**: enteros en centavos (`unitPriceCents`, `subtotalCents`, ...). El backend nunca devuelve decimales de dinero.
- **Fechas**: ISO 8601. En peticiones se acepta `"2026-10-01"` o `"2026-10-01T00:00:00Z"` (también con offset). En respuestas siempre `"2026-10-01T00:00:00.000Z"` (UTC). Para mostrar solo la fecha, tomar los 10 primeros caracteres.
- **Estados** (`status`): `DRAFT` | `SENT` | `PAID`. "Vencida" NO es un estado: es `isOverdue: true` (estado `SENT` y `dueDate` anterior a ahora).
- **Totales**: siempre calculados por el backend por factura: `subtotalCents`, `taxCents`, `totalCents`; cada línea trae `amountCents` (`round(quantity * unitPriceCents)`). `taxCents = round(subtotalCents * taxRate / 100)`.
- **Número**: `FAC-` + id con 4 dígitos (`FAC-0007`), asignado por el servidor; no se envía ni se puede modificar. No se reutiliza tras borrar.
- **IDs de líneas** (`items[].id`): PUT y PATCH status reemplazan las líneas, por lo que sus ids cambian. No usarlos como clave estable entre ediciones.
- **CORS**: se permite el origen definido en `FRONTEND_ORIGIN` (lista separada por comas; por defecto `http://localhost:5173`). Métodos: GET, POST, PUT, PATCH, DELETE, OPTIONS. Cabeceras: `Content-Type`, `Authorization`. Expuestas: `Content-Disposition`, `Location`. Los preflight OPTIONS responden 204.
- Las peticiones con cuerpo deben enviar `Content-Type: application/json` (admite `; charset=...`). Cualquier otro valor, o su ausencia, devuelve 400 `VALIDATION_ERROR`.
- Límites de entrada (400 si se superan): `clientName` 200 caracteres, `clientEmail` 254, `clientAddress` 500, `notes` 2000, `items[].description` 500, máximo 100 líneas, `quantity` ≤ 100000, `unitPriceCents` ≤ 100000000, `page` ≤ 100000.
- Las respuestas de `/api/*` incluyen `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `Referrer-Policy: no-referrer` y `Content-Security-Policy: frame-ancestors 'none'`.

## Formato de respuesta

Éxito:

```json
{ "data": <objeto o lista>, "meta": { ... } }
```

(`meta` solo en listados y en `stats/monthly`.)

Error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "details": [{ "field": "items.0.quantity", "message": "La cantidad debe ser un número" }]
  }
}
```

`details` es opcional; `field` es una ruta con puntos (`items.0.description`) y puede faltar.

| HTTP | `code` | Cuándo |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | JSON inválido, tipos/formatos incorrectos (zod), id no numérico, query params inválidos |
| 404 | `NOT_FOUND` | La factura no existe |
| 409 | `CONFLICT` | Reservado para conflictos de estado/unicidad (hoy ningún endpoint lo emite) |
| 422 | `UNPROCESSABLE_ENTITY` | Petición bien formada que incumple reglas de negocio |
| 500 | `INTERNAL_ERROR` | Error inesperado (mensaje genérico, sin stack) |

Los `message` están en español, listos para mostrar al usuario.

Reglas de negocio (422): `dueDate >= issueDate`; al menos una línea; `quantity > 0` en cada línea.

## Objeto Invoice

```json
{
  "id": 21,
  "number": "FAC-0021",
  "clientName": "Acme SA",
  "clientEmail": "compras@acme.com",
  "clientAddress": null,
  "issueDate": "2026-10-01T00:00:00.000Z",
  "dueDate": "2026-10-20T00:00:00.000Z",
  "status": "SENT",
  "isOverdue": false,
  "taxRate": 16,
  "notes": null,
  "items": [
    { "id": 37, "description": "Servicio", "quantity": 2, "unitPriceCents": 5000, "amountCents": 10000 }
  ],
  "subtotalCents": 10000,
  "taxCents": 1600,
  "totalCents": 11600,
  "createdAt": "2026-10-25T04:13:25.106Z",
  "updatedAt": "2026-10-25T04:13:25.112Z"
}
```

`quantity` puede ser decimal (1.5). `taxRate` es un porcentaje (0 a 100, decimales permitidos). `clientEmail`, `clientAddress` y `notes` son `string | null`.

## Cuerpo de POST / PUT (InvoiceRequest)

PUT reemplaza la factura completa (campos y líneas); mismo cuerpo que POST.

| Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- |
| `clientName` | string | sí | no vacío (se recorta) |
| `clientEmail` | string \| null | no | email válido; `""` o `null` se guardan como `null` |
| `clientAddress` | string \| null | no | `""` se guarda como `null` |
| `issueDate` | string ISO 8601 | sí | |
| `dueDate` | string ISO 8601 | sí | `>= issueDate` (422) |
| `status` | `DRAFT\|SENT\|PAID` | no | por defecto `DRAFT` |
| `taxRate` | number | no | 0 a 100, por defecto 0 |
| `notes` | string \| null | no | `""` se guarda como `null` |
| `items` | array | sí | mínimo 1 (422) |
| `items[].description` | string | sí | no vacía |
| `items[].quantity` | number | sí | `> 0` (422) |
| `items[].unitPriceCents` | integer | sí | `>= 0`, centavos |

```json
{
  "clientName": "Acme SA",
  "clientEmail": "compras@acme.com",
  "issueDate": "2026-10-01",
  "dueDate": "2026-10-20",
  "status": "SENT",
  "taxRate": 16,
  "items": [{ "description": "Servicio", "quantity": 2, "unitPriceCents": 5000 }]
}
```

## Endpoints

### GET /invoices

Listado paginado, ordenado por `issueDate` descendente (luego id descendente).

Query params (todos opcionales):

| Param | Tipo | Defecto | Notas |
| --- | --- | --- | --- |
| `status` | `DRAFT\|SENT\|PAID` | | filtra por estado (no existe `OVERDUE`; use `isOverdue` en cliente o stats) |
| `search` | string | | texto contenido en cliente o número (`FAC-0007`), máx. 100 |
| `page` | int >= 1 | 1 | |
| `pageSize` | int 1 a 100 | 10 | |

200:

```json
{
  "data": [ /* Invoice[] */ ],
  "meta": { "page": 1, "pageSize": 10, "total": 20, "totalPages": 2 }
}
```

### GET /invoices/:id

200 `{ "data": Invoice }`. 400 si el id no es entero positivo. 404 si no existe.

### POST /invoices

Cuerpo InvoiceRequest. 201 `{ "data": Invoice }` con cabecera `Location: /api/v1/invoices/:id`. 400 / 422 según las reglas anteriores.

Ejemplo 400:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos de entrada inválidos",
    "details": [
      { "field": "clientName", "message": "El cliente es obligatorio" },
      { "field": "issueDate", "message": "Fecha de emisión inválida (use ISO 8601)" }
    ]
  }
}
```

Ejemplo 422:

```json
{
  "error": {
    "code": "UNPROCESSABLE_ENTITY",
    "message": "La factura incumple reglas de negocio",
    "details": [{ "field": "dueDate", "message": "El vencimiento no puede ser anterior a la emisión" }]
  }
}
```

### PUT /invoices/:id

Cuerpo InvoiceRequest. 200 `{ "data": Invoice }`. 400, 404, 422.

### PATCH /invoices/:id/status

Cambio rápido de estado.

```json
{ "status": "PAID" }
```

200 `{ "data": Invoice }`. 400 si el estado es inválido, 404 si no existe.

### DELETE /invoices/:id

204 sin cuerpo. 404 si no existe.

### GET /invoices/:id/pdf

200 con `Content-Type: application/pdf` y `Content-Disposition: inline; filename="FAC-0021.pdf"`. Descargar con `fetch(...).blob()` o abrir la URL directamente. 400 / 404 usan el formato JSON de error.

### GET /stats/summary

```json
{
  "data": {
    "byStatus": {
      "DRAFT": { "count": 4, "totalCents": 8304800 },
      "SENT": { "count": 9, "totalCents": 20874200 },
      "PAID": { "count": 8, "totalCents": 17738700 }
    },
    "overdue": { "count": 4, "totalCents": 8270800 },
    "totalCount": 21
  }
}
```

`overdue` es un subconjunto de `SENT` (facturas enviadas con vencimiento pasado); no se suma aparte. Los totales incluyen impuestos.

### GET /stats/monthly

Totales por mes de emisión y estado, de los últimos `months` meses (mes actual incluido, orden cronológico, meses sin datos en 0).

Query: `months` (int 1 a 24, por defecto 6).

```json
{
  "data": [
    {
      "key": "2026-09",
      "label": "sept",
      "title": "septiembre de 2026",
      "totalsCents": { "DRAFT": 1392000, "SENT": 7070200, "PAID": 1879200 }
    }
  ],
  "meta": { "months": 3 }
}
```

`key` = `YYYY-MM` (UTC), `label` = mes corto en español, `title` = mes y año en español.
