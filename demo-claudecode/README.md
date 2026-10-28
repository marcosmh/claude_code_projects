# Invoices

Web application to create, view, edit and delete invoices, with a statistics dashboard, PDF export and username/password sign-in. The UI is in Spanish.

It is a **monorepo** (npm workspaces + Turborepo) with two independent applications, backend and frontend, and three shared packages. Each app has its own `package.json`, scripts, environment variables, tests and deployment.

## Tech stack

| Part | Stack |
| --- | --- |
| **Backend** (`apps/backend`) | Next.js 16 with route handlers only (REST API), TypeScript, Prisma 7 + SQLite, Zod 4, JWT with `jose`, `@react-pdf/renderer` |
| **Frontend** (`apps/frontend`) | React 19, Vite 8, React Router, TanStack Query, Zustand, React Hook Form + Zod, Tailwind v4 |
| **Shared** (`packages/`) | `shared-types`, `shared-utils`, `shared-validation` (TypeScript, no build step) |
| **Tooling** | Turborepo 2, Changesets, Vitest 5, Playwright + axe, ESLint, Docker, GitHub Actions. Node 22 |

## Features

- **Access**: sign in and out, password change (signs out the other sessions) and account lockout after 5 failed attempts. Each user only sees their own invoices.
- **Invoices**
  - Dynamic line items (description, quantity, unit price) with live totals.
  - Configurable tax per invoice and client data embedded in the invoice.
  - **Currency per invoice**: Mexican pesos (MXN), US dollars (USD) or euros (EUR), chosen when creating or editing. Amounts in different currencies are never added or compared, and there is no conversion (no exchange rates are used).
  - Statuses: Draft, Sent and Paid. "Overdue" is not a status: it is computed as `Sent` with a past due date.
  - Numbering `FAC-0001`, `FAC-0002`… that is never reused after a delete.
  - Search by number or client, and pagination with first and last page buttons.
  - **Filters** in a collapsible left-sidebar panel (only on the list): one or several statuses, an issue date range and an amount range (tax included, within one currency). Everything lives in the URL, so it can be shared.
- **Dashboard**: total cards, a chart by status and a chart of the last months, with tooltips, keyboard support and a table view. It shows **one currency at a time** (a "Moneda" selector, also in the URL) so amounts are never mixed.
- **PDF**: each invoice's detail page generates the PDF, with amounts in the invoice's currency.
- **Interface**: light/dark theme, collapsible menu and automatic accessibility checks (axe).

## Structure

```
demo-claudecode/                 monorepo root
├── apps/
│   ├── backend/                 REST API (src/, prisma/, tests/, docs/, Dockerfile)
│   └── frontend/                SPA (src/, e2e/, build/, deploy/, Dockerfile)
├── packages/
│   ├── shared-types/            REST contract types, statuses and labels
│   ├── shared-utils/            totals and cents calculation
│   └── shared-validation/       Zod schemas and input limits
├── docs/                        deployment
├── resources/                   API collections (Postman and REST Client)
├── scripts/                     start_apps and stop_apps
├── .changeset/                  independent versioning
├── docker-compose.yml           full stack, same origin
├── turbo.json  package.json  tsconfig.base.json
└── legacy/                      previous Next.js app, archived (not maintained)
```

## Getting started in development

Requirements: Node 22 or later.

```bash
npm install                                  # once, at the root

cd apps/backend
cp .env.example .env                         # set JWT_SECRET (at least 32 bytes: openssl rand -base64 48)
npx prisma migrate deploy                    # apply the migrations
npm run user:create -- you@example.com       # no public sign-up; prompts for the password (at least 12 characters)
npm run db:seed -- --force                   # optional: sample invoices (DELETES all invoices)
cd ../..

bash scripts/start_apps                      # backend :4000 and frontend :5173, in the background
bash scripts/stop_apps                       # stops them
```

Open http://localhost:5173. You can also use `npx turbo run dev` (foreground) or `npm run dev` inside each app. The frontend proxies `/api` to the backend (port 4000), so the browser talks to a single origin.

## Scripts

From the root, with Turborepo (`--filter=@invoices/backend` or `@invoices/frontend` for a single app):

| Command | Description |
| --- | --- |
| `npm run dev` | Development servers |
| `npm run build` | Build everything |
| `npm run lint` | ESLint |
| `npm run typecheck` | Type checking |
| `npm test` | Unit and integration tests |
| `npm run test:e2e` | Playwright + axe (starts its own backend on 4100 with a throwaway database) |
| `npm run changeset` | Register a change for versioning |
| `npm run version-packages` | Apply the pending changesets |

Each app also has its own scripts (`test:coverage`, `db:migrate`, `db:seed`, `user:create`…); see its `README.md`.

## Architecture

**Backend**: `route.ts` (routing only) → `controllers` (HTTP request and response) → `services` (all business logic) → `repositories` (the only Prisma access). Every method of the invoice repository takes `ownerId` first and filters by it: another user's invoice is a 404. Contract in `apps/backend/docs/api.md`.

**Frontend**: components → hooks → services → REST API. TanStack Query holds server data; Zustand holds only global UI state. Business rules (totals, overdue, numbering, aggregates) are computed by the backend. The list filters are read from the URL (`useInvoiceFilters`) and translated into the `GET /invoices` parameters; the statistics accept `?currency=`.

**Shared packages**: REST contract, input validation and the money rule (integer cents, round half up). Shared validation is for UX only: the backend always revalidates and never accepts `role`, `ownerId` or totals from the client. A change to `shared-types` or `shared-validation` is a contract change.

## Authentication and security

- JWT in `HttpOnly; SameSite=Strict` cookies: a 15-minute access token and a rotating refresh token, signed with **different keys**. Neither is readable from JavaScript.
- Logging out, reusing a refresh token or changing the password on another device revokes the access token immediately.
- CSRF protection: an allowed `Origin` (or a same-origin request) is required on every write authenticated by cookie.
- Rate limiting, security headers on the API and a full CSP on the production frontend.
- In production the server **does not start** without distinct, high-entropy `JWT_SECRET` and `JWT_REFRESH_SECRET`, or without `FRONTEND_ORIGIN` (an https origin). The refresh cookie is named `__Secure-refresh`.

Details and decisions in `apps/backend/docs/jwt-migration.md`.

## Database

SQLite (`apps/backend/prisma/dev.db`). Models: `User`, `RefreshToken`, `Invoice` and `InvoiceItem` (cascade). Amounts are integer cents, each invoice stores its `currency` (invoices that predate that column were left as USD) and totals are never stored; that is why the list's amount filter is computed in memory before paginating (fine with SQLite and small volumes). Indexes match the real queries (owner first). PostgreSQL is postponed on purpose.

## Testing

- Unit and integration tests with Vitest in the backend, the frontend and each package, with coverage thresholds that must not drop.
- E2E with Playwright and accessibility with axe.
- The collections in `resources/` (`postman/` is generated with `gen_postman.py`; `rest_client/` is written by hand) are validated with Newman and httpyac against a temporary database whenever the API changes (recipe in `CLAUDE.md`: export `DATABASE_URL`, `NEXT_DIST_DIR` and `JWT_SECRET` before creating the user, or it writes to `dev.db`). Last Newman validation: 35 requests, 94 assertions, 0 failures.

## CI/CD and deployment

- GitHub Actions in `.github/workflows/`: `backend.yml`, `frontend.yml`, `packages.yml` and `e2e.yml`, with path filters. All pass green on GitHub; the old `ci.yml` was removed.
- Backend and frontend are built in Docker separately (`apps/*/Dockerfile`, using `turbo prune`). The design assumes **same origin**: nginx serves the SPA and proxies `/api` to the backend.
- `docker-compose.yml` brings up the full stack to test the integration.

Full guide in [`docs/deployment.md`](docs/deployment.md).

## Status

The monorepo migration is done except for one item of the final validation: checking the deployment under real https. Longer-term backlog: PostgreSQL, admin routes, password recovery, a clients module, email delivery and, if needed, currency conversion with exchange rates.
