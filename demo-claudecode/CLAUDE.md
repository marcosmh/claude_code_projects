# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Invoice (facturas) app, UI text in Spanish. The git root is the parent directory (`claude_code_projects`); the project lives in `demo-claudecode/`.

## Active app: `backend/` + `frontend/`

The active app is the layered rewrite introduced in commit `de8b5fe` ("refactor using agents"): a REST API in `backend/` and a Vite SPA in `frontend/`. **New work goes there.** The Next.js app in the repo root (`app/`, `components/`, `lib/`, `prisma/`, `tests/`) is the **legacy** version; see "Legacy root app" below. Decision recorded 2026-10-24.

Each sub-project has its own `package.json`, `node_modules` and `README.md`; run commands from inside its directory (the relative `DATABASE_URL` resolves against the cwd).

### Backend (`backend/`)

Next.js 16 route handlers only (no pages) + TypeScript + Prisma 7 (SQLite) + Zod. Contract: `backend/docs/api.md`.

```bash
cd backend
cp .env.example .env     # DATABASE_URL (default file:./prisma/dev.db), FRONTEND_ORIGIN (default http://localhost:5173)
npm install
npm run db:migrate       # apply migrations
npm run user:create -- you@example.com   # no public sign-up; prompts for the password (min 12 chars). The first user inherits invoices without an owner
npm run db:seed -- --force   # WARNING: deletes ALL invoices first; refuses without --force or with NODE_ENV=production
npm run dev              # http://localhost:4000
npm test                 # vitest; temp SQLite + fake repository, never prisma/dev.db
npm run typecheck
npm run build
```

Flow: `src/app/api/v1/**/route.ts` (routing only, wrapped in `withErrorHandler`) -> `src/controllers` (parse request, build HTTP response) -> `src/services` (all business logic, depends on the `InvoiceRepository` interface) -> `src/repositories` (the only Prisma access). Wiring is in `src/container.ts`. Also: `src/validators` (Zod), `src/dto` (contracts + mapper), `src/domain` (totals, overdue, invoice number), `src/proxy.ts` (CORS, rate limiting, cross-origin write guard; in Next 16 `middleware` is called `proxy`).

Auth: JWT. A short-lived access token (15 min, HS256 via `jose`, claims `sub`/`role`/`ver`) travels in `Authorization: Bearer`; the rotating refresh token lives in an httpOnly cookie `refresh` (`Path=/api/v1/auth`, `SameSite=Strict`) and only its hash is stored in `RefreshToken`, with family revocation on reuse (10 s grace window, `REFRESH_REUSE_GRACE_SECONDS`). The server will not start without `JWT_SECRET` (>= 32 bytes). scrypt passwords, `User.role` (`USER`/`ADMIN`) and `tokenVersion`; `withAuth` wraps every invoice/stats route and passes the user id down (`withRole` exists, no admin routes yet). Rate limit ignores `X-Forwarded-For` unless `TRUSTED_PROXY_HOPS` > 0. Env vars are listed in `backend/.env.example`; details in `backend/docs/jwt-migration.md`. **In progress (decision 6 of that doc, 2026-10-26):** moving the access token to an HttpOnly cookie with a same-origin deployment; steps 1-5 done (security headers, `Sec-Fetch-Site` write guard, dual mode on by default via `AUTH_COOKIE_ACCESS`, frontend without tokens in JS), the rest is NOT implemented, so the description above is still how auth works today. **Every `InvoiceRepository` method takes `ownerId` first** and filters by it; another user's invoice is a 404, never a 403. Never add a repository query without the owner filter.

`backend/AGENTS.md` applies: this Next.js (16.x) differs from older versions; read `node_modules/next/dist/docs/` before using an API.

### Frontend (`frontend/`)

React 19 + TypeScript + Vite + React Router + Tailwind v4 + TanStack Query + Zustand + React Hook Form + Zod. Consumes the backend REST API.

```bash
cd frontend
cp .env.example .env     # optional: VITE_API_URL (default http://localhost:4000/api/v1)
npm install
npm run dev              # http://localhost:5173 (backend must be on 4000)
npm run build            # tsc -b + vite build
npm run lint
npm test                 # vitest + Testing Library (jsdom)
npm run test:e2e         # Playwright + axe; starts its own backend (4100, e2e.db) and frontend (5174)
```

Mandatory flow: components -> hooks -> services -> REST API. Session: `useSession` (TanStack Query, key `queryKeys.session`), `RequireAuth` protects all routes except `/login`, `apiClient` sends the access token (`localStorage`, only via `services/tokenStorage.ts`) as `Authorization: Bearer`, uses `credentials: "include"` only on `/auth/login|refresh|logout|password`, renews on 401 with `/auth/refresh` (single-flight plus `navigator.locks` across tabs) and retries once; if the refresh fails it calls the handler set in `main.tsx` (clears cached data and sends the user to `/login`). A failed logout sets the local `loggedOut` flag so the session is not auto-restored. TanStack Query holds server data; Zustand only holds global UI state (`uiStore`, `toastStore`); filters live in the URL. Business rules (totals, `isOverdue`, invoice number, dashboard aggregates) come from the backend; the only exception is the informative `utils/totalsPreview.ts`. See `frontend/README.md` for details.

### Domain rules to preserve

- Money is integer cents (`unitPriceCents`); totals are never stored, always derived.
- `status` is a plain string (`DRAFT|SENT|PAID`) validated by Zod, not a Prisma enum.
- Invoice `number` is `FAC-` + id padded to 4 digits, assigned in a transaction right after insert, so it never repeats after deletes. Client data is embedded in the invoice (no Client model).
- "Overdue" is not a status; it is computed as `SENT` with `dueDate < now`.
- Dark mode is a `dark` class on `<html>` set by an inline script in `frontend/index.html`; `src/globals.css` remaps the zinc palette under `:root.dark`, so use plain palette classes (avoid `text-white` on remapped dark buttons).

## Legacy root app

The Next.js monolith in the root (Server Actions + Prisma, `npm run dev|build|lint|test` from `demo-claudecode/`) is **not maintained** and **does not build**: `components/ThemeToggle.tsx` and `components/TopBar.tsx` import `@/hooks/useHtmlClass`, which was deleted in commit `55371f3`. Do not add features to it. It is kept only for reference until the owner removes it; its root `dev.db`, `prisma/` and `users.json` are not used by the active app.

The root `tsconfig.json` excludes `backend/` and `frontend/` so root tooling does not mix them (they have their own `@/` aliases).

## Audit

A read-only audit (quality, testing, architecture, security) was done on 2026-10-24. Since then: backend hardening (limits, headers, rate limiting), unit tests with coverage ratchets, CI (`.github/workflows/ci.yml`) and Playwright + axe E2E. Authentication and per-user authorization were added afterwards (see Backend) and migrated to JWT on 2026-10-26, followed by a read-only security audit and fixes (rate limit, atomic lockout, refresh grace window, cross-tab refresh, logout flag). Account lockout (5 failures, 15 min) and password change (revokes other sessions) are in. Known open gaps: no admin routes (roles exist), no forgotten-password flow, the `isOverdue` rule for invoices due today, and the audit's pending items (scrypt N=2^17 with rehash, access token valid up to 15 min after logout, HSTS, `FRONTEND_ORIGIN` required in production; see "Pendiente" in `backend/docs/jwt-migration.md`). Re-verify findings against `backend/` and `frontend/` before acting on them.

**Leftovers of the JWT migration:** the `Session` table and the opaque-session methods in `AuthRepository` are unused and will be removed in a separate later migration (decision 5 of `backend/docs/jwt-migration.md`); do not build on them.

## Available skills

- `react-rules` (`.claude/skills/react-rules/SKILL.md`): React + TypeScript best practices (Zustand, Zod + React Hook Form, effects, hooks, React Query/SWR).
- `frontend-design` (`.agents/skills/frontend-design/SKILL.md`, linked from `.claude/skills/frontend-design`): distinctive visual design for new or existing UI (palette, typography, layout, UX writing, responsive and accessible by default).

## Skill trigger rules

- `react-rules`: invoke it whenever the user asks to create a React application or component, or to add/modify components, hooks, state, forms or UI logic in React.
- `frontend-design`: invoke it automatically whenever the user asks to improve, redesign or change the visual interface of the app. This includes:
  - Improving or changing the visual design of the app.
  - Optimizing UI/UX and the user experience.
  - Redesigning React components, pages or layouts.
  - Improving styles, typography, colors, spacing, animations and responsive design.
  - Modernizing the look of an interface or improving its usability.

  Use it for every request that implies visual, design or UX improvements in the frontend. When a request also touches React component logic, use it together with `react-rules`.
