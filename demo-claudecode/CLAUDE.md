# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Invoice (facturas) app, UI text in Spanish. The git root is the parent directory (`claude_code_projects`); the project lives in `demo-claudecode/`.

## Active app: `apps/backend/` + `apps/frontend/`

The active app is the layered rewrite introduced in commit `de8b5fe` ("refactor using agents"): a REST API in `apps/backend/` and a Vite SPA in `apps/frontend/`. **New work goes there.** The Next.js app archived in `legacy/` is the **legacy** version; see "Legacy root app" below. Decision recorded 2026-10-24.

**Monorepo** (npm workspaces + Turborepo; plan: `~/.claude/plans/pasted-content-id-59dd-me-gustar-a-encapsulated-quasar.md`, tag `pre-monorepo` is the rollback point). The root of `demo-claudecode/` holds `package.json`, `turbo.json` and `tsconfig.base.json`; apps are `@invoices/backend` and `@invoices/frontend`, shared code lives in `packages/`, and the old app is archived in `legacy/`. Migration phases 0-7 are done: structure, shared packages, persistence cleanup, security hardening, and CI/Docker/versioning. **Phase 8 (final validation), partly done**: `resources/` was validated on 2026-10-27 against a throwaway backend (Newman: 32 requests, 84 assertions, 0 failures; httpyac: 33/33 with the expected status codes; the `.http` file uses REST Client syntax, so httpyac needs a copy where `{{login.response.body.$.data.token}}` becomes `{{login.data.token}}`). **Still pending**: run the split workflows on GitHub (they were only linted with `actionlint`, never run), and test the production-only behaviour (`__Secure-` cookies, startup checks) under real https. The old `.github/workflows/ci.yml` stays until the split workflows (`backend|frontend|packages|e2e.yml`) have run green; then delete it.

Day to day: install once from `demo-claudecode/` (`npm install`; the apps have no lockfile of their own). `bash scripts/start_apps` starts both apps in the background (logs and PIDs in `scripts/.run/`) and `bash scripts/stop_apps` stops them by process group; both are idempotent, `stop_apps` exits 1 if a port stays busy and never touches a process that is not from this project. Run app scripts from inside each app (the relative `DATABASE_URL` resolves against the cwd), with `npm run <script> --workspace=@invoices/<app>`, or with `npx turbo run <task>` from the root. The root pins `typescript` ^6 (hoisted, used by typescript-eslint) while the backend keeps its own TypeScript 7 nested; do not remove either. `npm` warns that install scripts of `better-sqlite3`, `prisma` and `esbuild` are not approved; builds and tests work regardless.

### Backend (`apps/backend/`)

Next.js 16 route handlers only (no pages) + TypeScript + Prisma 7 (SQLite) + Zod. Contract: `apps/backend/docs/api.md`.

```bash
cd apps/backend
cp .env.example .env     # DATABASE_URL (default file:./prisma/dev.db), FRONTEND_ORIGIN (default http://localhost:5173)
npm run db:migrate       # apply migrations
npm run user:create -- you@example.com   # no public sign-up; prompts for the password (min 12 chars). The first user inherits invoices without an owner
npm run db:seed -- --force   # WARNING: deletes ALL invoices first; refuses without --force or with NODE_ENV=production
npm run dev              # http://localhost:4000
npm test                 # vitest; temp SQLite + fake repository, never prisma/dev.db
npm run typecheck
npm run build
```

Flow: `src/app/api/v1/**/route.ts` (routing only, wrapped in `withErrorHandler`) -> `src/controllers` (parse request, build HTTP response) -> `src/services` (all business logic, depends on the `InvoiceRepository` interface) -> `src/repositories` (the only Prisma access). Wiring is in `src/container.ts`. Also: `src/validators` (Zod), `src/dto` (contracts + mapper), `src/domain` (totals, overdue, invoice number), `src/proxy.ts` (CORS, rate limiting, cross-origin write guard; in Next 16 `middleware` is called `proxy`).

Auth: JWT in httpOnly cookies (decision 6 of `apps/backend/docs/jwt-migration.md`, 2026-10-26). Login and refresh set two cookies, both `HttpOnly; SameSite=Strict` (`Secure` and the `__Secure-` prefix only in production): the short-lived access token `at` (15 min, HS256 via `jose`, claims `sub`/`role`/`ver`/`sid`, `Path=/api/v1`; `sid` = refresh family, and `authenticate` checks the family is still live, so logout, refresh-reuse detection and a password change on another device cut the access token at once) and the rotating refresh token `refresh` (`Path=/api/v1/auth`; only its hash is stored in `RefreshToken`, with family revocation on reuse and a 10 s grace window, `REFRESH_REUSE_GRACE_SECONDS`). The body of login/refresh still carries the access token for Bearer clients (curl, Postman, REST Client in `resources/`); the frontend ignores it. `withAuth` accepts `Authorization: Bearer` or the `at` cookie (Bearer wins, the two never mix); a write authenticated by the cookie must come from our frontend (`utils/csrf.ts`: an allowed `Origin`, or, when the browser sends none, `Sec-Fetch-Site` `same-origin` or `none`; `same-site` is refused because a sibling subdomain is not our frontend), and `proxy.ts` rejects any write with a foreign `Origin` or `Sec-Fetch-Site: cross-site`. `AUTH_COOKIE_ACCESS=0` turns the cookie mode off (on by default because the frontend depends on it). Deployment is meant to be same-origin (reverse proxy serving the SPA and `/api`); CORS only matters in dev. Security headers in `next.config.ts` (`X-Frame-Options`, `Permissions-Policy`, HSTS in production). The server will not start without `JWT_SECRET` (>= 32 bytes). Access and refresh tokens are signed with different keys: in production `JWT_REFRESH_SECRET` is required and must differ (outside production it is derived from `JWT_SECRET`), both are rejected if low-entropy, and `FRONTEND_ORIGIN` must be set to bare https origins (checked at startup in `instrumentation.ts`). In production the refresh cookie is `__Secure-refresh`. scrypt passwords, `User.role` (`USER`/`ADMIN`) and `tokenVersion`; `withAuth` wraps every invoice/stats route and passes the user id down (`withRole` exists, no admin routes yet). Rate limit ignores `X-Forwarded-For` unless `TRUSTED_PROXY_HOPS` > 0. Env vars are listed in `apps/backend/.env.example` (`JWT_REFRESH_SECRET` still has to be added there by hand; it is required in production); details in `apps/backend/docs/jwt-migration.md`. Still to do in decision 6: step 6 (login/refresh bodies stop carrying the token, `mode: "token"` for scripts) and step 7 (cleanup). **Every `InvoiceRepository` method takes `ownerId` first** and filters by it; another user's invoice is a 404, never a 403. Never add a repository query without the owner filter.

API test collections live in `resources/`: `postman/postman-api.json` is generated by `resources/postman/gen_postman.py` (edit the generator and rerun it, never the JSON), `rest_client/rest-client.http` is written by hand. Both cover the cookie mode and CSRF guards (folder/section "Cookies y CSRF") and the revoked token after logout; validate them against a backend with a throwaway database (Newman for Postman, httpyac for the `.http`) whenever the API changes.

`apps/backend/AGENTS.md` applies: this Next.js (16.x) differs from older versions; read `node_modules/next/dist/docs/` before using an API.

### Frontend (`apps/frontend/`)

React 19 + TypeScript + Vite + React Router + Tailwind v4 + TanStack Query + Zustand + React Hook Form + Zod. Consumes the backend REST API.

```bash
cd apps/frontend
cp .env.example .env     # optional: VITE_API_URL (default /api/v1, proxied by Vite to VITE_PROXY_TARGET, default http://localhost:4000)
npm run dev              # http://localhost:5173 (backend must be on 4000)
npm run build            # tsc -b + vite build
npm run lint
npm test                 # vitest + Testing Library (jsdom)
npm run test:e2e         # Playwright + axe; starts its own backend (4100, e2e.db) and frontend (5174)
```

Mandatory flow: components -> hooks -> services -> REST API. Session: `useSession` (TanStack Query, key `queryKeys.session`), `RequireAuth` protects all routes except `/login`, no token is ever readable by JavaScript: `apiClient` sends every request with `credentials: "include"` and no `Authorization` (same origin through the Vite proxy in dev), renews on 401 with `/auth/refresh` (single-flight plus `navigator.locks` across tabs; the non-sensitive `refreshedAt` mark in `services/sessionFlags.ts` tells a tab that another already renewed) and retries once; if the refresh fails it calls the handler set in `main.tsx` (clears cached data and sends the user to `/login`). A failed logout sets the local `loggedOut` flag (`services/sessionFlags.ts`) so the session is not auto-restored; `main.tsx` purges the legacy `accessToken` from `localStorage`. TanStack Query holds server data; Zustand only holds global UI state (`uiStore`, `toastStore`); filters live in the URL. Business rules (totals, `isOverdue`, invoice number, dashboard aggregates) come from the backend; `utils/totalsPreview.ts` is only a form preview and calls the same `calcTotals` as the backend (`@invoices/shared-utils`). The build also emits `dist/_headers` and `dist/security-headers.conf` (`build/securityHeaders.ts`), the full CSP (with `frame-ancestors`) plus the other security headers that the production host must send, derived from the same policy as the `<meta>` tag. See `apps/frontend/README.md` for details.

### Deployment and CI

Full guide in `docs/deployment.md`. Same-origin by design: nginx serves the SPA and proxies `/api` to the backend, so there is no CORS and the `SameSite=Strict` cookies stay first-party (different registrable domains do not work with this auth design). Both Dockerfiles take the monorepo root as build context and use `turbo prune`; the `docker build` commands are in `docs/deployment.md`. The backend image runs `next start` with SQLite in the `/data` volume; migrations are a separate release step (`npx prisma migrate deploy`) and the first user is created with `npm run user:create` (so `tsx` is a runtime dependency). `docker-compose.yml` brings the whole stack up on `http://localhost:8080` and needs `JWT_SECRET`, `JWT_REFRESH_SECRET` and an https `FRONTEND_ORIGIN`; it is an integration test, not a production recipe (SQLite means one backend replica). Workflows in `.github/workflows/` (`backend|frontend|packages|e2e.yml`) have path filters and read-only permissions; actions are pinned by tag, not by SHA. Versioning is per package with Changesets (`.changeset/README.md`).

### Shared packages (`packages/`)

Internal workspace packages that ship TypeScript source (`exports` -> `src/index.ts`, no build step; the backend lists them in `transpilePackages`). They must stay isomorphic (no `node:*`, Prisma or secrets), use relative imports (never `@/`) and have their own tests and coverage thresholds.

- `@invoices/shared-types`: REST wire types (`InvoiceResponse`, `StatsSummaryResponse`, `PaginationMeta`, `AuthUser`, `SessionBodyDto`, error envelope), `STATUSES`, `STATUS_LABELS`, `isInvoiceStatus`.
- `@invoices/shared-utils`: `roundCents`, `lineAmountCents`, `calcTotals`, `toCents` (money rule, half up, no float noise).
- `@invoices/shared-validation` (peer `zod`): `LIMITS`, `AUTH_LIMITS`, invoice request/list schemas and their types. Shared validation is for UX only; the backend always revalidates and never trusts client-sent `role`, `ownerId` or totals.

`isOverdue`, `buildInvoiceNumber`, repositories and services stay in the backend. The backend `domain/`, `dto/`, `types/` and `validators/` modules re-export from the packages, and the frontend `@/types/*` and `@/utils/{status,limits,totalsPreview}` do the same, so call sites did not change. A change to a shared type or schema is a contract change: keep `/api/v1` compatible.

### Domain rules to preserve

- Money is integer cents (`unitPriceCents`); totals are never stored, always derived.
- `status` is a plain string (`DRAFT|SENT|PAID`) validated by Zod, not a Prisma enum.
- Invoice `number` is `FAC-` + id padded to 4 digits, assigned in a transaction right after insert, so it never repeats after deletes. Client data is embedded in the invoice (no Client model).
- "Overdue" is not a status; it is computed as `SENT` with `dueDate < now`.
- Dark mode is a `dark` class on `<html>` set by an inline script in `apps/frontend/index.html`; `src/globals.css` remaps the zinc palette under `:root.dark`, so use plain palette classes (avoid `text-white` on remapped dark buttons).

## Legacy root app

The Next.js monolith, archived in `legacy/` (formerly the root; Server Actions + Prisma, outside the workspaces, own `node_modules`), is **not maintained** and **does not build**: `components/ThemeToggle.tsx` and `components/TopBar.tsx` import `@/hooks/useHtmlClass`, which was deleted in commit `55371f3`. Do not add features to it. It is kept only for reference until the owner removes it; its `dev.db`, `prisma/` and `users.json` are not used by the active app. Its own `tsconfig.json` and tooling live inside `legacy/`.

## Audit

A read-only audit (quality, testing, architecture, security) was done on 2026-10-24. Since then: backend hardening (limits, headers, rate limiting), unit tests with coverage ratchets, CI (now split into `backend|frontend|packages|e2e.yml`; the old `ci.yml` is kept until they run green) and Playwright + axe E2E. Authentication and per-user authorization were added afterwards (see Backend) and migrated to JWT on 2026-10-26, followed by a read-only security audit and fixes (rate limit, atomic lockout, refresh grace window, cross-tab refresh, logout flag). The access token then moved from `localStorage` to an httpOnly cookie (steps 1-5 of decision 6: security headers, `Sec-Fetch-Site` guard, cookie mode in the backend, frontend without tokens in JS, Vite proxy for same-origin dev) and B1 closed it off: the access token carries `sid`, so logout and refresh-reuse revoke it instantly. Account lockout (5 failures, 15 min) and password change (revokes other sessions) are in. Known open gaps: no admin routes (roles exist), no forgotten-password flow, the `isOverdue` rule for invoices due today, and the audit's pending items (B4/B5 minor; `kid`-based key rotation; plus steps 6-7 of decision 6; see "Pendiente" in `apps/backend/docs/jwt-migration.md`). Re-verify findings against `apps/backend/` and `apps/frontend/` before acting on them.

**Persistence (phase 5):** the unused `Session` table and its `AuthRepository` methods were removed (migration `20261027150000_drop_session_tune_indexes`, which also reshapes the `Invoice` and `RefreshToken` indexes to match the real queries: owner first, then order/status). SQLite stays on purpose; PostgreSQL is postponed. Emails are already lower-cased by the auth validator. When moving to PostgreSQL, revisit `registerFailedLogin` (read-then-write; SQLite serialises writers, PostgreSQL does not) and `contains` search (case-sensitive there).

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
