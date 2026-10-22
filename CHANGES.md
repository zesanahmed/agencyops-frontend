# CHANGES — Phase I (final contract sync, Activity feed, demo login)

Compared with your GitHub `main` (`12b04d7`, end of Phase H). Backend verified at `agencyops-api` `08f0b20`.

## Summary
- **Demo login works out of the box.** The three buttons now default to the seeded accounts
  (`owner@/manager@/member@demo.agencyops.test`, `DemoPass123!`); env vars only override them.
- **Activity feed** at `/organizations/[id]/activity` (new sidebar item): newest-first, grouped by day, filter by type and
  project, paginated, all in the URL. The server's `summary` is shown as-is and links to the task/project (never to deleted things).
- **Server-provided permissions.** `GET /organizations/:id` now gives the caller's membership and permission list; the UI
  gates on it (RBAC mirror updated for the new `client:*`, `billing:*`, `invoice:*`, `activity:*` permissions and the
  Manager/Team member differences). One request instead of the whole member directory just to learn one's own role.
- **Notifications deep-link** to the task / sprint / project via `data`, are marked read on click, and know all 9 types.
- **Sprint completion** asks where unfinished tasks should go (backlog, another open sprint, or stay) and reports how many moved.
- **Dates can be cleared** on projects and tasks (the backend now accepts `null`).
- **Types/mappers** extended for the final contract (project `taskCounts/memberCount/activeSprint`, task `assignee` and counts,
  comment `author/mentions`, notification `data`, activity). All new fields are optional so nothing existing changed shape.
- **Contract discrepancy found:** `FRONTEND_CONTRACT.md` §3.3 says sprint-complete accepts `moveOpenTasksTo: null`; the backend
  code accepts only `"BACKLOG"` or a sprint id. The frontend follows the code. Worth telling Claude-1 to fix the doc.

## Tests
304 -> 333 tests (new: activity view + helpers, final-contract mappers, sprint completion, notification links, date clearing, RBAC matrix).
