# Backend de facturas

API REST en Next.js 16 (route handlers, sin páginas) + TypeScript + Prisma 7 (SQLite). Contrato completo en [docs/api.md](docs/api.md).

## Arquitectura

```
src/app/api/v1/**/route.ts   handler HTTP (solo enruta, envuelto con withErrorHandler)
        -> src/controllers   parsean la petición y devuelven la respuesta HTTP
        -> src/services      toda la lógica de negocio (dependen de la interfaz InvoiceRepository)
        -> src/repositories  único acceso a Prisma
```

Otros: `src/validators` (zod), `src/dto` (contratos y mapper), `src/domain` (totales, overdue, número), `src/middleware` (manejo de errores), `src/proxy.ts` (CORS y rate limiting; en Next 16 `middleware` se llama `proxy`), `src/container.ts` (composición), `src/utils`.

## Puesta en marcha

```bash
cp .env.example .env     # DATABASE_URL y FRONTEND_ORIGIN
npm install
npm run db:migrate       # aplica migraciones
npm run db:seed -- --force   # ATENCIÓN: borra las facturas y siembra 20 (no corre con NODE_ENV=production)
npm run dev              # http://localhost:4000
```

Ejecutar siempre desde `backend/`: la `DATABASE_URL` relativa se resuelve contra el cwd.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | servidor de desarrollo en el puerto 4000 |
| `npm run build` / `npm start` | build y servidor de producción (puerto 4000) |
| `npm test` | vitest (usa una base SQLite temporal y repositorio falso; nunca `prisma/dev.db`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` / `db:generate` / `db:seed` | Prisma |

## Variables de entorno

- `DATABASE_URL` (por defecto `file:./prisma/dev.db`)
- `FRONTEND_ORIGIN` origen(es) CORS permitidos, separados por comas (por defecto `http://localhost:5173`)
- `RATE_LIMIT_DISABLED=1` desactiva el rate limiting (solo para la suite E2E; se ignora con `NODE_ENV=production`)
- `NEXT_DIST_DIR` directorio de build de Next (por defecto `.next`; la suite E2E usa `.next-e2e` para no chocar con `npm run dev`)
