# CHANGES — Phase L1 (client portal: sign-in, shell, projects)

Builds on Phase K2. Backend verified at `agencyops-api` `08f0b20`. **L2** adds the portal's messages, requests, files, invoices
and the invoice payment flow.

## New
- **Separate portal session.** `createTransport(realm)` now powers two independent API clients (staff and portal) with their own
  token, refresh endpoint (`/portal/auth/refresh`) and store; a 401 on one never touches the other. Staff behaviour is unchanged.
- **`/client/login`** (agency slug + e-mail + password, `?org=` prefill, one-click **Demo client login**), **`/portal/accept-invite`**
  (the link staff/e-mail hand a contact: set password, signed in).
- **Portal shell + gate**: calm header with tabs (Overview, Projects, Files, Invoices), sign out / sign out of all devices.
- **`/client`** overview (greeting, active projects, tasks done/total, project cards), **`/client/projects`**, and
  **`/client/projects/[id]`** with Overview (progress bar + per-status breakdown, dates), Tasks (status filter + paging in the
  URL) and Updates tabs.
- `src/proxy.ts` guards `/client/*` with the portal's own hint cookie; `/client/login` bounces signed-in contacts.
- Staff login page links to the portal sign-in.

## Contract notes
- `FRONTEND_CONTRACT.md` §4 says the invoice payment-status query is `?sessionId=`; the backend code reads `session_id`. L2 follows the code.
- Portal login needs the organization **slug**, but the invitation flow never gives the contact one (the contact payload only has the
  organization's display name). Suggest to Claude-1: add `organizationSlug` to the portal contact (`/portal/auth/me`, login, accept-invite
  responses) so the portal can remember it and pre-fill sign-in. Until then the field is a plain input with a hint, and the staff
  invitation hand-off can append `?org=<slug>`.

## Tests
543 -> 586 (portal transport isolation, portal API contract, session restore/redirect/logout, login and invitation
forms, dashboard/projects/detail views, proxy realm rules).

## Not covered
Not run against a live server; the contact invitation e-mail/link flow depends on your backend's e-mail configuration.
