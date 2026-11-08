# Walkthrough script (target 8–9 minutes)

Record at 1080p, browser at ~1440 px wide, with the seeded demo data. Open `/login` before you start. Say what the *requirement* is as you show it; the "Shows" column is what the evaluator is looking for.

| Time | Do | Say / shows |
|---|---|---|
| 0:00 | Home page → scroll → Product → Pricing | Public pages, real content, SEO metadata, responsive nav. Pricing = Free vs Pro, honest about test mode |
| 0:45 | `/login` | **One-click role login**: three Demo login buttons, plus the portal's. Sign in as **Owner** |
| 1:00 | Organization overview | Overview with **charts** (work by status; billing at a glance), stat cards, skeleton on reload |
| 1:30 | Sidebar tour; open **Projects** → search "web", filter Active, sort, page 2 | **URL state**: point at the address bar changing; copy the URL, open in new tab |
| 2:15 | Open *Website Redesign* → Tasks tab → open a task | Rich task page: assignee, collaborators, subtasks, comments with @mention, **attachment upload** (attach a PNG: preview + progress) |
| 3:15 | Sprints tab → complete the active sprint | Complete dialog asks where unfinished tasks go |
| 3:45 | **Role-based UI**: sign out → Demo login as **Team member** → open the sidebar | No Invoices, no Plan & billing, no member admin; Manager sits in between. "Hidden in the UI *and* refused by the API" |
| 4:30 | Owner again → **Clients** → Brightline → Contacts → Access; task → *Show to client* | Client is a separate boundary, granted per project |
| 5:15 | **Invoices → New invoice** (3-step wizard) → validation errors → create → send | **Multi-step form** with live totals; React Hook Form + Zod; server-recomputed totals |
| 6:00 | Settings → **Plan & billing** → Upgrade (or show Pro) → Stripe test card | **Stripe payment**, success redirect polls the server before saying "Pro" (mention: cancel path exists too) |
| 6:45 | New private window → `/client/login` → **Demo client login** | **Client portal**: separate session, calm UI, progress, only shared tasks |
| 7:15 | Portal → Messages (send one), Requests (new request), Files (upload) | Real two-way collaboration; switch back to staff: the **Client requests** inbox shows it |
| 8:00 | Portal → Invoices → Pay → `4242…` | "Payment received" only after the server confirms (webhook); staff invoice flips to Paid |
| 8:30 | Show a failing state: stop the backend or visit `/organizations/bogus` | Error boundary / not-found, toast on API failure, never a blank screen |
| 8:45 | Terminal: `npm test` (or just show the green summary) and the commit history | Tests pin the API contract, RBAC, payments, accessibility; meaningful commits |

## Before you record

- Backend running with the seed (`npm run seed -- --reset` for fresh dates), worker running, Stripe in test mode with the webhook listener active.
- Use a clean browser profile (no stale sessions). Keep one incognito window for the client.
- Have a small PNG ready for uploads. Test card `4242 4242 4242 4242`, any future date, any CVC.
- Do a dry run of the two payments; they are the only parts that depend on external services.
