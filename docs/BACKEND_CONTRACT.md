# Backend contract notes

What the frontend assumes about `zesanahmed/agencyops-api`, and where the API differs from its own docs. Update this file, `src/types/domain.ts`, `src/lib/api/mappers.ts` and the contract tests together when the backend changes.

The frontend is built against **`zesanahmed/agencyops-api`** and its types were verified from that
repository's source (first at `afe5f62`, re-verified against `08f0b20` for the final contract), then exercised against a
locally running copy of the real backend and a real PostgreSQL.

- **Envelope:** success is `{ success, message, data }`; failure is `{ success: false, message, errors: [{ path, message }] }`.
- **Lists:** `data.<plural>` plus `data.pagination` (`organizations`, `members`, `invitations`, `teams`,
  `projects`, `sprints`, `tasks`, `comments`, `notifications`). Maximum page size is 100.
- **Single resources** are nested under their name (`data.organization`, `data.member`, `data.task`, …).
  Creating an invitation returns `inviteToken` *beside* `invitation`.
- **People:** the final backend embeds `{ membershipId, user }` for assignees, comment authors/mentions and collaborators
  (additive; mapped to optional fields). Most views still resolve names through the *member directory*
  (`features/members/use-member-directory.ts`), which also covers members who have since left ("Former member").
  The caller's own role and permission list come from `GET /organizations/:id` (`membership`).
- **Enums:** task status `BACKLOG | TODO | IN_PROGRESS | IN_REVIEW | DONE`; project status ends in
  `CANCELLED`; invitations and role changes accept only `MANAGER | TEAM_MEMBER`.
- **Search/filter support differs per endpoint** (projects and tasks have `search`; teams, members,
  sprints and invitations take only `page`/`limit`), so the UI only offers filters the backend honours.
- **Permissions** mirror `src/modules/rbac/permissions.ts` in `src/lib/rbac.ts` (UI only; the backend is
  authoritative). `src/lib/rbac.test.ts` and `src/lib/api/contract.test.ts` pin both to the backend.
- The refresh cookie is `SameSite=Strict` with path `/api/v1/auth`, so the browser talks to the backend
  through this app's same-origin `/api/v1` rewrite (`BACKEND_ORIGIN`, fixed at build time). The backend now
  also configures CORS, but this app doesn't rely on it.
- **Teams:** names are unique per organization (409); `description` is a string (send `""` to clear, not `null`);
  a team's members are *not* filtered by organization membership, so someone removed from the organization
  can still appear on a team ("Former member"); assigning a team to a project does **not** add its people to
  the project; and the backend still lists assignments of soft-deleted teams (shown as "Deleted team").
  There is no "projects of a team" endpoint, so those are derived from each project's assignments.

- **Projects:** the slug is derived from the name, so a duplicate name is a 409 ("slug already exists"), shown on the
  Name field. `startDate`/`dueDate` are optional UTC calendar dates; the "due on or after start" rule only runs when
  **both** are in the request body, so the edit form always sends both. Project and task dates **can be cleared** with
  `null` (final backend; sprint dates are required and cannot). Clearing the description sends `""`. Project lists sort
  by `createdAt`, `name` or `dueDate`. List/detail items now carry `taskCounts`, `memberCount` and `activeSprint`
  (typed as optional: absent on create/update responses).
- **Sprints:** completing takes an optional `moveOpenTasksTo` of `"BACKLOG"` or a sprint id; omitted leaves open tasks in the
  completed sprint. (`FRONTEND_CONTRACT.md` §3.3 says `null`, but the backend's validation rejects `null` — verified in
  `sprint.validation.ts` at 08f0b20; the frontend follows the code.)

- **Notifications:** the list takes `page`, `limit`, `unreadOnly`. `unreadOnly` is parsed with `z.coerce.boolean()` and
  `Boolean("false")` is `true`, so the frontend only sends it when it is `true` (sending `unreadOnly=false` returns *only*
  unread). The unread count comes from `meta.total` of an `unreadOnly=true&limit=1` request. Items carry `data` with the ids
  needed to deep-link (`notificationHref`); notifications written before `data` existed have none and are not clickable.
  Invoice notifications lead to the invoice page. Preference rows are created lazily by `PUT`, so a type with no row is
  shown on/on. Demo users have e-mail disabled for every type.
- **Activity:** `GET /organizations/:id/activity` (filters `entityType`, `projectId`, `taskId`, `actorMembershipId`).
  OWNER/MANAGER see the whole organization, TEAM_MEMBER only projects they belong to. The `summary` text is rendered as-is.
- **Access:** `GET /organizations/:id` returns the caller's `membership` with the server's `permissions` list; the UI gates on
  that list and only falls back to the mirrored matrix in `src/lib/rbac.ts` while it loads (no more member-directory
  lookup to find one's own role).
- **Account & security (final backend):** forgot/reset password (`POST /auth/forgot-password` answers identically for unknown
  addresses, so the UI never confirms an account exists; reset tokens are single-use), e-mail verification
  (`/verify-email?token=`, fired exactly once per page load), change password (revokes **every** session, so the UI signs out
  afterwards), session list/revoke, delete account (password required only for accounts that have one; **409** while the user
  still owns an organization). Nothing in the backend is gated on a verified address, so the unverified banner only nudges.
  The password policy is **8–72 characters and ≤72 UTF-8 bytes** (bcrypt); an earlier frontend rule of 128 was wrong.
- **E-mailed links** are `/verify-email`, `/reset-password`, `/invitations/accept` (bridged to `/invite/[token]`) and `/portal/accept-invite` (client contacts).
- **OAuth (Google/GitHub):** the buttons are hidden unless `NEXT_PUBLIC_OAUTH_PROVIDERS` is set. The start URL goes through the
  `/api/v1` proxy, so for the round-trip to stay first-party the backend's `API_PUBLIC_URL` must be this site's origin and the
  provider's redirect URI `<origin>/api/v1/auth/oauth/<provider>/callback`. The callback page (`/oauth/callback`) trades the
  refresh cookie for an access token exactly once. Not exercised against real provider credentials in this repo.
- **Clients (staff side):** `/organizations/:id/clients` (+ `/:clientId` with Contacts and Projects tabs). Contacts are portal
  users, not org members. Creating/re-inviting/enabling a contact returns `inviteToken` **only while the backend has no e-mail
  delivery**; the UI then shows a copyable `/portal/accept-invite?token=` link, otherwise it says the invitation was e-mailed.
  Deleting a client disables its contacts, removes their access and unlinks its projects (invoices stay). A project belongs to at
  most one client (409 on a second link). Contacts see nothing until granted access per linked project.
- **Invoices (staff side):** amounts are integer cents and the server recomputes totals (`subtotal - discount + tax`); the form
  only previews them. Only DRAFT invoices are editable; `send` does **not** e-mail anyone, it makes the invoice visible in the
  portal (and queues the PDF); a zero-total draft can't be sent (422); a paid invoice can't be voided (409). PDFs are rendered
  by the backend **worker** (202 + later `pdfUrl`), so the page polls while waiting.
- **Billing/payments:** the organization plan is OWNER-managed through Stripe Checkout/Portal (the browser leaves the app for the
  Stripe URL). `/payment/success` polls `GET /billing` every 2 s for ~30 s and says "paid" only when the **server** reports
  Pro; after the timeout it says "processing", never success. State changes only via the signed Stripe webhook. Test card
  `4242 4242 4242 4242`.
- **Client collaboration (staff side):** project workspace -> **Client** tab (Updates, Messages, Files, Requests; section in the URL)
  and an org-wide inbox at `/organizations/:id/requests`. Read needs `client-portal:read` (all roles), writing needs
  `client-portal:manage` (Owner/Manager). Messages are paged **oldest-first**, so the thread opens on the last page. Request
  status/resolution note can be changed (`null` clears the note). Shared files from either side are listed with who uploaded them.
- **Uploads:** multipart field `file`, allow-list and 10 MB limit mirrored from `upload.ts` (the server also checks the real file
  signature and answers 400 "File content does not match its declared type"). `apiUpload` uses XMLHttpRequest for real progress
  and cancel, with the same 401 -> refresh -> retry as other calls. Cloudinary must be configured on the backend (503 otherwise).
- **Task attachments** live on the task page; list/upload/delete use `task:read` / `task:update`.
- **Known backend gap:** task reads don't include `clientVisible`; only the visibility PATCH returns it. The task page therefore
  sets visibility explicitly until the current value is known (see CHANGES.md).
- **Client portal (a separate realm):** contacts are not org members. `/portal/*` has its own access token, its own refresh cookie
  (`agencyops_refresh_token_client`, path `/api/v1/portal/auth`) and its own client-side hint cookie (`ao_portal_session`); a staff
  session never opens the portal and vice versa (`src/proxy.ts`, `usePortalAuthStore`, `createTransport` realms in
  `src/lib/api/client.ts`). Sign-in needs the agency's **organization slug** + e-mail + password; the invitation link
  (`/portal/accept-invite?token=`) sets the password and signs the contact in. Every project route is gated server-side by a
  per-project grant (a project without one answers 404). Tasks are only the ones staff marked client-visible, with no assignee,
  comments or attachments. There is no portal password reset or change-password endpoint yet.
- **Portal collaboration and invoices:** a contact's Messages (thread), Files (upload; only the agency can delete), Requests (the
  contact sees only **their own**, plus the agency's resolution note) are tabs of the portal project page; `/client/files` is a
  project picker over the same list. Invoices: `/client/invoices[/id]`, never DRAFT; **Pay** asks the server to open a Stripe
  Checkout session (amount comes from the server, `409` if not payable) and leaves the app. `/payment/success?type=invoice` polls
  `GET /portal/invoices/:id/payment-status?session_id=` (the backend reads `session_id`; the contract's `sessionId` is wrong) and
  shows paid only when `confirmed` is true; FAILED shows the reason with a retry link; CANCELED / voided invoices are reported;
  a 30 s timeout says "processing", never success.
- **Demo login:** the three buttons use the accounts created by the backend's `npm run seed` (`*@demo.agencyops.test`,
  password `DemoPass123!`); `NEXT_PUBLIC_DEMO_*` env vars override them.

If the backend changes a shape, update `src/types/domain.ts`, `src/lib/api/mappers.ts` and the contract
tests together. `npm run probe:api` prints the live response shapes to check for drift.

## Where the written contract and the code disagree (the code wins)

| Topic | `FRONTEND_CONTRACT.md` | Backend code (08f0b20) | Frontend follows |
|---|---|---|---|
| Sprint completion with open tasks | `moveOpenTasksTo: null` goes to the backlog | accepts `"BACKLOG"` or a sprint id; `null` is a 400 | the code |
| Invoice payment status query | `?sessionId=` | reads `session_id` | the code |
| Task visibility to clients | implied readable | `clientVisible` is returned only by the visibility PATCH, not by task reads | sets it explicitly until the field exists |
| Portal sign-in | not mentioned | needs the organization **slug**, which a contact is never given | free-text field with hint and `?org=` prefill |

## Rate limits and proxies

The backend limits register, login and public invitation routes to 10 requests per 15 minutes (refresh: 30), keyed by client
IP. Behind this app's `/api/v1` rewrite the backend only sees the proxy's address unless **`TRUST_PROXY`** is set on the backend
(it is supported; use `1`) and the host forwards the client IP in `X-Forwarded-For`. A 429 on refresh is treated as a temporary
outage (the session is kept and a retry is offered), not a sign-out.
