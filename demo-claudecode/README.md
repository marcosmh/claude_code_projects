# Facturas — V1 (CRUD)

Next.js (App Router) + Tailwind CSS + Prisma (SQLite) + Zod.

## Arranque

```bash
npm install
cp .env.example .env          # DATABASE_URL="file:./dev.db"
npx prisma migrate dev        # crea la base de datos
npm run db:seed               # 3 facturas de ejemplo (borra las existentes)
npm run dev                   # http://localhost:3000
```

## Scripts

- `npm test` — pruebas de `lib/totals.ts`
- `npm run build` / `npm run lint`

## V2 (pendiente)

Módulo de clientes, PDF con `@react-pdf/renderer`, PostgreSQL, filtros y facturas vencidas.
