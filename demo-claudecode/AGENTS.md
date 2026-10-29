# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) and other coding agents working in this repository. **`CLAUDE.md` is the source of truth; read it first.** This file is the short version.

Invoice (facturas) app, UI text in Spanish. It is an npm-workspaces + Turborepo monorepo. The git root is the parent directory (`claude_code_projects`); the monorepo lives in `demo-claudecode/`.

## Layout

| Path | What it is |
| --- | --- |
| `apps/backend` | `@invoices/backend`: REST API, Next.js 16 route handlers only, Prisma 7 + PostgreSQL (Supabase), Zod, JWT in httpOnly cookies |
| `apps/frontend` | `@invoices/frontend`: Vite + React 19 SPA (TanStack Query, Zustand, React Hook Form) |
| `packages/shared-types`, `shared-utils`, `shared-validation` | REST contract types, money/totals rule, Zod schemas and limits. Isomorphic TypeScript source, no build step |
| `legacy/` | Archived Next.js monolith. **Not maintained, does not build. Do not add features to it** |
| `resources/`, `docs/`, `scripts/`, `.changeset/` | API test collections, deployment guide, `start_apps`/`stop_apps`, versioning |

Each app has its own `package.json`, scripts, env vars, tests and Dockerfile and must stay runnable and deployable on its own. Share code only through `packages/`.

## Commands

```bash
npm install                        # once, from demo-claudecode/ (single lockfile; the apps have none of their own)
bash scripts/start_apps            # backend :4000 + frontend :5173 in the background (logs in scripts/.run/)
bash scripts/stop_apps             # stops them; exits 1 if a port stays busy
npx turbo run lint typecheck test build     # everything (add --filter=@invoices/backend for one app)
npm run test:e2e --workspace=@invoices/frontend   # Playwright + axe; starts its own backend (4100) and frontend (5174)
npm run changeset                  # register a change (each app and package versions on its own)
```

Run app scripts from inside the app (`cd apps/backend`): the relative `DATABASE_URL` resolves against the cwd. Setup, migrations, `user:create` and `db:seed` are listed in `CLAUDE.md`. Run `npx turbo run lint typecheck test build` before declaring work done.

## Rules that are easy to break

- **Every `InvoiceRepository` method takes `ownerId` first and filters by it.** Another user's invoice is a 404, never a 403. Never add a repository query without the owner filter.
- Every invoice has a `currency` (`MXN|USD|EUR`). Never add or compare amounts of different currencies and never invent exchange rates: stats take `?currency=` and the dashboard shows one currency at a time; the amount filter of `GET /invoices` requires `currency`.
- Money is integer cents and totals are never stored. Business rules (totals, `isOverdue`, invoice number, aggregates) live in the backend; the frontend only displays them. The one frontend calculation, `utils/totalsPreview.ts`, calls the shared `calcTotals`.
- Shared validation is for UX only: the backend always revalidates and never trusts client-sent `role`, `ownerId` or totals. A change to `shared-types` or `shared-validation` is a contract change; keep `/api/v1` compatible.
- Invoice list filters (states, issue date, currency + amount) live in the left sidebar panel and in the URL (`useInvoiceFilters`); they map to the `GET /invoices` query params.
- Frontend flow is components -> hooks -> services -> REST API. No token is ever readable by JavaScript.
- Backend flow is `route.ts` -> controllers -> services -> repositories (the only Prisma access). Wiring is in `src/container.ts`.
- Auth: access (`at`) and refresh tokens are signed with different keys; in production `JWT_REFRESH_SECRET` and an https `FRONTEND_ORIGIN` are required and the server refuses to start without them.
- Dark mode is a `dark` class on `<html>`; `src/globals.css` remaps the zinc palette, so use plain palette classes (avoid `text-white` on remapped dark buttons).
- Database: PostgreSQL on Supabase (migrated 2026-10-29 from SQLite; baseline migration `20261029120000_init_postgres`). The root pins `typescript` ^6 (used by typescript-eslint) while the backend keeps its own TypeScript 7: do not remove either.
- API test collections: edit `resources/postman/gen_postman.py` and rerun it, never the JSON; validate with Newman/httpyac against a throwaway database whenever the API changes (recipe in `CLAUDE.md`: export `DATABASE_URL`, `NEXT_DIST_DIR`, `JWT_SECRET` first and verify them before `user:create`, or it hits `prisma/dev.db`).

## Skills

`react-rules` for any React component, hook, state or form work; `frontend-design` for any visual or UX change in the frontend (use both when a request touches component logic too). Details in `CLAUDE.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
