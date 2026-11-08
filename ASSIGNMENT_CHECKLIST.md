# Assignment-7 checklist

Status as of this phase. ✅ = implemented and covered by tests or verifiable in the repo. ⬜ = something only you can do.
"Roles" in the brief (Admin / User / Provider) map to this product as **Owner + Manager** (administration), **Team member**
(does the work) and the **client contact** (customer-facing portal).

## Mandatory requirements

| Requirement | Status | Where / evidence |
|---|---|---|
| App Router architecture; Server Components by default; `layout`, `page`, `error`, `loading` | ✅ | `src/app/**`; `loading.tsx` on every data page; `error.tsx` for app, portal, root + `global-error.tsx`; route tests: `route-manifest.test.ts`, `route-structure.test.ts` |
| Modern, responsive, accessible UI; Tailwind + a component library | ✅ | Tailwind CSS v4 + Radix UI primitives (`src/components/ui`); mobile-first layouts; axe-core suite `src/test/a11y.test.tsx`. *Do a final DevTools device check on your deployed build* |
| Authentication & authorization: secure login, protected routes (middleware), role-based UI | ✅ | JWT access token in memory + HttpOnly refresh cookie; `src/proxy.ts`; permission-driven sidebar/actions (`src/lib/rbac.ts`, `useOrg().can`); `sidebar.test.tsx`, `rbac.test.ts`, `proxy.test.ts` |
| One-click demo login for each role | ✅ | `/login` (Owner, Manager, Team member) and `/client/login` (client) — `login-form.tsx`, `portal-login-form.tsx` |
| API integration & state: TanStack Query, global state, skeletons, error boundaries | ✅ | TanStack Query everywhere; Zustand for the two sessions; skeletons + `ErrorState` on every list/detail |
| Forms: React Hook Form + Zod, validation matches backend | ✅ | every form; schemas mirror backend validators (e.g. password 8–72 chars/bytes, invoice limits); tests in `schemas.test.ts`, `invoices.test.tsx` |
| Payment: Stripe (test mode), success + cancel flows, no fake payments | ✅ code · ⬜ live run | subscription Checkout/Portal and invoice Checkout; `/payment/success` + `/payment/cancel`; paid is shown only when the server confirms (`billing.test.tsx`). Needs your Stripe test keys + webhook to run end to end |
| ≥ 20 meaningful frontend commits | ⬜ | 20 on `main` when last checked and growing with each phase; keep messages descriptive |
| Demo credentials provided | ✅ | README table; `DEMO.md` |
| Working live URL | ⬜ | follow `DEPLOYMENT.md`, then fill the README table |
| 5–10 minute walkthrough video | ⬜ | script in `DEMO.md` |

## Core project rules

| Rule | Status | Notes |
|---|---|---|
| 3 fixed roles, enforced at route and UI level | ✅ | Owner / Manager / Team member (+ separate client boundary); server is authoritative |
| Real API only; no mock/hardcoded core data | ✅ | every workflow calls `agencyops-api`; tests mock the network, the app doesn't |
| URL state sync (filter, sort, search, pagination) | ✅ | `useUrlState`; projects, tasks, clients, invoices, requests, activity, notifications, portal lists |
| No placeholder content | ✅ | marketing copy matches the shipped product (guarded by `marketing-content.test.tsx`); the contact form says plainly it opens your mail app because the API has no contact endpoint |
| Performance & loading: `next/image`, skeletons, Server Components | ✅ | no raw `<img>`; charts load dynamically; list pages have their own skeletons |
| Error handling: `error.tsx` + toasts, never a blank screen | ✅ | plus per-component `ErrorState` with retry |

## Page requirements (≥ 18 pages)

The app has **43 routes with a page**. Coverage of the brief's categories:

| Category | Pages |
|---|---|
| Public (5) | `/`, `/services`, `/pricing`, `/about`, `/contact` |
| Authentication | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/oauth/callback`, `/invite/[token]`, `/invitations/accept` |
| "Admin" (Owner / Manager) | overview with charts `/organizations/[id]`; resource management with filters: `projects`, `clients`, `invoices`, `requests`, `members`, `teams`; reports/settings: `activity`, `settings` (organization, plan & billing, notification preferences) |
| "Provider" (Team member) | `my-work`, `projects/[id]`, `projects/[id]/tasks/[id]`, `notifications` |
| "User" (client contact) | `/client`, `/client/projects`, `/client/projects/[id]`, `/client/files`, `/client/invoices`, `/client/invoices/[id]`, `/portal/accept-invite` |
| Profile & settings (form with validation) | `/profile` (change password, sessions, delete account) |
| Payment (2) | `/payment/success`, `/payment/cancel` |
| Shared | `not-found.tsx`, `error.tsx`, `global-error.tsx` |

Also covered: **empty states** on every list, **multi-step form** (invoice wizard), **file upload with preview and progress**,
**reusable components and hooks**, **strict TypeScript with no `any`** in application code, **SEO metadata** on public pages,
**Recharts** charts, **Sonner** toasts.

## Honest gaps

- Free-plan limits aren't enforced by the backend. Pricing says so.
- Not exercised against live Stripe/Cloudinary/e-mail inside this repo (mocked in tests). Run the smoke test in `DEPLOYMENT.md`.
- Two places where the backend's own docs and code disagree are recorded in `docs/BACKEND_CONTRACT.md`; the code is followed.
