# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Invoice (facturas) app: Next.js 16 App Router + Tailwind v4 + Prisma 7 (SQLite) + Zod + `@react-pdf/renderer`. UI text is in Spanish. The git root is the parent directory (`claude_code_projects`); this app lives in `demo-claudecode/`.

## Commands

```bash
npm run dev                       # http://localhost:3000
npm run build                     # also type-checks; run before declaring work done
npm run lint
npm test                          # vitest run (all tests in tests/**)
npx vitest run tests/stats.test.ts -t "agrupa por estado"   # single file / test
npx prisma migrate dev            # apply schema changes (regenerates client)
npm run db:seed                   # WARNING: deletes ALL invoices first
```

Setup: `cp .env.example .env` (`DATABASE_URL="file:./dev.db"`), then `npx prisma migrate dev`. `postinstall` runs `prisma generate`.

## Next.js version caveat

`AGENTS.md` is right: this Next.js (16.4) differs from older versions. Read the relevant guide in `node_modules/next/dist/docs/01-app/` before using an API. The project runs with `cacheComponents: true`, which has concrete consequences:

- Route segment config like `export const dynamic = "force-dynamic"` is a **build error**. Pages that read the DB or `new Date()` must call `await connection()` (from `next/server`) first, otherwise prerendering fails with "unstable value `new Date()`". See `app/invoices/page.tsx`, `app/dashboard/page.tsx`, `app/invoices/new/page.tsx`.
- `usePathname` in the layout's `Sidebar` is wrapped in `<Suspense>`.
- Route params use the generated helper types (`PageProps<"/invoices/[id]">`, `RouteContext<...>`); run `npx next typegen` if they're missing.

## Architecture

**Data flow.** Server Components query Prisma directly. Mutations are Server Actions in `lib/actions/invoices.ts` (`createInvoice`, `updateInvoice`, `deleteInvoice`) called from the client `components/InvoiceForm.tsx`; they take `unknown`, validate with `invoiceSchema` (`lib/validators.ts`), return `{ errors }` on failure, and `redirect()` on success. There is no REST API; the only route handler is `app/invoices/[id]/pdf/route.ts`.

**Prisma 7 specifics.**
- Client is generated to `app/generated/prisma` (gitignored) and imported from `@/app/generated/prisma/client`; it needs the `better-sqlite3` driver adapter, wired once in `lib/prisma.ts` (singleton).
- `prisma.config.ts` (not `schema.prisma`) holds the datasource URL.
- A relative `file:./dev.db` resolves against the **process cwd**, i.e. the project root `dev.db` — the `prisma/dev.db` file is a stray, not the live DB.
- `prisma/seed.ts` builds its own client; it does not import `lib/prisma.ts`.

**Domain rules to preserve.**
- Money is stored as integer cents (`unitPriceCents`); the form converts from decimal input. Totals are never stored — always derived via `calcTotals` in `lib/totals.ts` (shared by list, detail, form, dashboard and PDF).
- `status` is a plain string (`DRAFT|SENT|PAID`) validated by Zod, not a Prisma enum (SQLite-friendly, easy Postgres migration later). Status labels live in `lib/validators.ts`.
- Invoice `number` is `FAC-` + id padded to 4 digits, assigned in a transaction right after insert, so it never repeats after deletes. Client data is embedded in the invoice (no Client model).
- "Overdue" is not a status; it is computed as `SENT` with `dueDate < now` in `lib/stats.ts`.

**Dashboard.** `lib/stats.ts` holds the pure aggregation (`summarize`, `monthlyTotals`) and `STATUS_COLOR`; charts in `components/charts/` are hand-written SVG/HTML client components with hover tooltips and a "Ver como tabla" fallback (no chart library). Status colors must stay consistent between charts and `StatusBadge` (color follows the entity).

**Theming.** Dark mode is a `dark` class on `<html>` (set by an inline script in `app/layout.tsx` before paint, toggled by `components/ThemeToggle.tsx`). Instead of `dark:` variants, `app/globals.css` remaps the `--color-zinc-*`/blue/green/red variables under `:root.dark`, so components use plain Tailwind palette classes (e.g. `bg-zinc-900 text-zinc-50` inverts correctly; avoid `text-white` on zinc-900 buttons). Chart series colors are `--series-1..3` CSS variables, validated for CVD safety in both modes.

**PDF.** `components/pdf/InvoiceDocument.tsx` is called as a plain function (not via `createElement`) inside the route handler, because `renderToBuffer` rejects the wrapped element type. Currency strings have NBSP replaced since the built-in Helvetica lacks it.

## Tests

Vitest (`vitest.config.mts`, `@` alias) covers only pure logic in `lib/` (`totals`, `stats`). UI and actions have no automated tests; verify them by running the app.
