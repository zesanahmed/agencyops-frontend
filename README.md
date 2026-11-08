# AgencyOps — frontend

Operations software for small software agencies: **teams, projects, sprints and tasks** for the agency, plus a separate
**client portal** where clients follow progress, exchange messages and files, raise requests and **pay invoices by card**.

Built with Next.js (App Router), TypeScript (strict), Tailwind CSS and Radix UI primitives, against the real
[`agencyops-api`](https://github.com/zesanahmed/agencyops-api) backend. No mock data: every workflow calls the API.

| | |
|---|---|
| Live app | _add your Vercel URL here_ |
| API | _add your backend URL here_ |
| Walkthrough video | _add the link here_ |
| Demo script | [`DEMO.md`](./DEMO.md) |
| Requirement-by-requirement status | [`ASSIGNMENT_CHECKLIST.md`](./ASSIGNMENT_CHECKLIST.md) |
| Deploying it | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |

## Try it in one click

On `/login` there are three **Demo login** buttons, one per internal role, and `/client/login` has a **Demo client login**.
They use the accounts created by the backend's `npm run seed` (organization *Brightline Studio*, slug `brightline-studio`).

| Role | Email | Password | Lands on |
|---|---|---|---|
| Owner | `owner@demo.agencyops.test` | `DemoPass123!` | organization overview (everything, billing, members) |
| Manager | `manager@demo.agencyops.test` | `DemoPass123!` | same, without billing management and member administration |
| Team member | `member@demo.agencyops.test` | `DemoPass123!` | same, read-mostly: no clients' invoices, no admin |
| Client contact | `client@demo.agencyops.test` | `DemoPass123!` (org slug `brightline-studio`) | the client portal |

The seed has to have been run against the backend you point at (see `DEPLOYMENT.md`). These are public demo accounts.

## What's in it

**Internal workspace** (`/organizations/[id]/…`)
- Overview with charts (work by status, billing at a glance), activity feed, notifications inbox with per-type preferences
- Projects (URL-synced search, filter, sort, pagination), project workspace with Overview / Tasks / Sprints / Teams / People / **Client** tabs
- Sprints (start, complete with "move unfinished tasks" choice), tasks with subtasks, collaborators, comments with @mentions, **attachments**
- Teams and members, invitations by link, role changes
- **Clients**: companies, portal contacts (invite, resend, disable), per-project access grants
- **Invoices**: three-step wizard, send, void, PDF, payment attempts; **client requests** inbox
- **Plan & billing**: Stripe Checkout / customer portal (owner only)
- Account: change password, sessions, delete account, e-mail verification, optional Google/GitHub sign-in

**Client portal** (`/client/…`, its own session and cookie): overview, shared projects with progress, tasks the agency chose to share,
updates, messages, files (upload with progress), requests, invoices with **Pay**.

**Public site**: home, product, pricing, about, contact. SEO metadata, Open Graph, sitemap and robots included.

## Roles and how they're enforced

Three internal roles per organization — **OWNER, MANAGER, TEAM_MEMBER** — plus client contacts, who are deliberately *not* a
fourth role but a separate security boundary.

- **Route level:** `src/proxy.ts` (Next middleware) redirects anonymous visitors away from app and portal routes using two
  independent hint cookies, so a staff session never opens the portal and vice versa. It is a convenience gate; the real check
  is the server.
- **UI level:** the sidebar, actions and tabs follow the **server's permission list** (`GET /organizations/:id` →
  `membership.permissions`), with `src/lib/rbac.ts` as a tested mirror of the backend matrix while it loads.
- **Server level:** the backend is authoritative on every request; a hidden button is never treated as security.

## Architecture in brief

- **Server Components by default;** `"use client"` only for interactive pieces (forms, TanStack Query hooks, charts).
  Every data page has `loading.tsx`; `error.tsx` exists for the app, the portal and the root; `not-found.tsx` is global.
- **One API layer** (`src/lib/api`): `createTransport(realm)` gives the staff API and the portal API their own tokens, refresh
  endpoints and stores. Access tokens live in memory; the refresh token is an HttpOnly cookie the browser never exposes to JS.
  A 401 triggers one single-flight refresh and a retry; only a definitive rejection ends the session.
- **Same-origin proxy:** the browser calls `/api/v1/*` on this app and Next rewrites it to the backend (`BACKEND_ORIGIN`), so
  the backend's `SameSite=Strict` cookie stays first-party in production.
- **State:** TanStack Query for server state, Zustand only for the two auth sessions. List filters, sort and pagination live in the URL.
- **Forms:** React Hook Form + Zod everywhere, with schemas mirroring the backend's validation; server field errors are mapped back onto fields.
- **Money:** integer cents end to end; amounts parsed from decimal strings without floating point. A payment is shown as paid
  only when the **server** confirms it (the Stripe webhook), never because a browser reached a success URL.
- **Accessibility:** semantic landmarks, labelled controls, focus-visible styles, no colour-only status; an automated axe-core
  suite covers the public pages and sign-in forms.

```
src/
  app/            routes: (marketing) (auth) (app)/organizations/[id]/… client/(portal)/… payment/ invite/ portal/
  components/     ui/ (primitives) shared/ (DataTable-style pieces, states) layout/ marketing/ client/
  features/       one folder per domain: auth, organizations, projects, tasks, sprints, teams, members, clients,
                  invoices, billing, client-portal (staff side), portal (client side), notifications, activity, dashboard…
  lib/            api/ (transport, services, mappers, errors), rbac, money, files, format, auth/
  stores/         auth-store, portal-auth-store
  types/          domain.ts (API types)
docs/BACKEND_CONTRACT.md    what the UI assumes about the API, and where the API's docs and code disagree
```

## Getting started

Prerequisites: Node 20+, and the [backend](https://github.com/zesanahmed/agencyops-api) running (PostgreSQL + Redis; `npm run seed` for demo data).

```bash
cp .env.example .env.local      # set BACKEND_ORIGIN (e.g. http://localhost:5000)
npm install
npm run dev                     # http://localhost:3000
```

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` (also validates App Router route types) |
| `npm run lint` | ESLint |
| `npm test` | Vitest + Testing Library (unit, component, contract and route-structure tests) |
| `npm run probe:api` | prints live response shapes from the backend to spot contract drift |

### Environment

| Variable | Purpose |
|---|---|
| `BACKEND_ORIGIN` | **Server-side, read at build time.** Where `/api/v1/*` is proxied to (no trailing slash, no `/api/v1`) |
| `NEXT_PUBLIC_SITE_URL` | This site's public URL (metadata, sitemap) |
| `NEXT_PUBLIC_API_BASE_URL` | Leave unset to use the same-origin proxy (recommended) |
| `NEXT_PUBLIC_DEMO_*` | Optional overrides for the demo buttons (defaults are the seed accounts) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Optional: makes the contact form open the visitor's mail app |
| `NEXT_PUBLIC_OAUTH_PROVIDERS` | Optional: `google,github` to show social sign-in (needs backend credentials) |

`NEXT_PUBLIC_*` values are bundled into client code: never put a secret in one.

## Quality gates

`npm run typecheck && npm run lint && npm test && npm run build` must all pass. The tests pin the API contract (types, mappers,
RBAC matrix), the route structure (every page's folder provides the params it reads), the auth/session behaviour (token
isolation between staff and portal, single-flight refresh), payment confirmation states (including timeouts), file upload
(progress, cancel, 401 retry), and accessibility of the public pages.

## Known limitations

- Free-plan limits (5 members, 3 projects) are shown but **not enforced** by the backend yet.
- The contact form has no backend endpoint, so it opens the visitor's mail client (or copies the message) and says so.
- Contacts have no password-reset or change-password endpoint on the backend yet.
- Task reads don't expose whether a task is client-visible (see `docs/BACKEND_CONTRACT.md`).
- Payments run in Stripe **test mode** (card `4242 4242 4242 4242`).
- Not run end to end here against live Stripe, Cloudinary or an e-mail provider; those paths are covered with mocked responses
  that follow the backend code. See `DEPLOYMENT.md` for the smoke test to run once they're configured.

---

## Tooling compatibility

`eslint` is pinned to **9.39.5** and `typescript` to **~5.9.3** on purpose.

- **ESLint 9 (end-of-life since 2026-08-06) is kept for a documented compatibility reason.**
  `eslint-config-next` (all 16.x) depends on `eslint-plugin-react`, `eslint-plugin-import` and
  `eslint-plugin-jsx-a11y`, none of which support ESLint 10. `eslint-plugin-react` 7.37.5 crashes
  on ESLint 10 because `context.getFilename()` was removed.
- **TypeScript stays on 5.9.x** because `typescript-eslint` does not support TypeScript 7 yet
  (its peer range is `<6.1.0`; support is tracked for TypeScript >= 7.1).
- Next's setup docs say `npm i -D eslint eslint-config-next`, which today resolves to ESLint 10 and
  breaks linting — keep the explicit `eslint@9.39.5` pin.
- `npm install` prints a deprecation notice for ESLint 9. That is expected.

**Revisit when both are true:** `eslint-plugin-react` (or `eslint-config-next`) supports ESLint 10, and
`typescript-eslint` supports TypeScript >= 7.1. Then move to TypeScript 7 + ESLint 10 without shims.

## Type-checking

`npm run typecheck` runs `next typegen` before `tsc --noEmit`. Next generates the App Router route
types (the ones that validate layouts/pages against their route params) only during `dev`, `build` or
`typegen`; plain `tsc --noEmit` on a clean checkout skips that validation and can miss a layout placed
under the wrong route (for example an organization layout in `src/app/(app)/` instead of
`src/app/(app)/organizations/[organizationId]/`). `src/app/route-structure.test.ts` guards the same
mistake during `npm test`.

