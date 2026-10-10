# CHANGES — Phase E (Teams)

Compared with your GitHub `main` (Phase D, commit `2449bdb`; identical to sandbox baseline `6fc8a7b`).

## Summary
- **Team pages.** The teams list is now a grid of cards (real member avatars, member and project counts) linking to a
  new team detail page `/organizations/[id]/teams/[teamId]` with **Members** and **Projects** tabs (`?tab=`).
- **Workload.** Members show their open-task count (derived from open projects; the backend has no such endpoint) and
  the page shows Members / Projects / Open tasks stats.
- **Edit and delete.** Teams can be renamed or re-described (clearing a description sends `""`: the backend rejects
  `null`). Duplicate names (409) appear on the Name field. Deleting warns when the team is assigned to projects.
- **Assignment workflow in both directions.** From a team, assign it to projects; from a project, the new **Teams** tab
  assigns teams. Both explain that assigning a team does *not* add its people to the project (the backend has no such sync).
- **Backend quirks handled.** Someone removed from the organization can still be on a team ("Former member", removable);
  the backend still lists assignments of deleted teams ("Deleted team", with Unassign); a malformed or unknown team id
  shows "Team not found".
- **Role-aware.** OWNER/MANAGER can create, edit, delete and manage members/assignments; TEAM_MEMBER sees everything read-only.
- **Breadcrumbs** show the team name. **README** now documents the team rules, the new backend CORS/rate limits, and a
  deployment warning about the per-IP rate limiters behind the same-origin rewrite.
- **Tests:** 119 -> 152 (team detail for all roles, project teams panel, form 409 handling, list, workload helpers,
  breadcrumbs, route manifest, `useAction`).

## New files
- `src/app/(app)/organizations/[organizationId]/teams/[teamId]/loading.tsx`
- `src/app/(app)/organizations/[organizationId]/teams/[teamId]/page.tsx`
- `src/components/shared/avatar-stack.tsx`
- `src/features/projects/project-teams-panel.test.tsx`
- `src/features/projects/project-teams-panel.tsx`
- `src/features/teams/hooks.ts`
- `src/features/teams/schemas.ts`
- `src/features/teams/team-detail.test.tsx`
- `src/features/teams/team-detail.tsx`
- `src/features/teams/team-form-dialog.test.tsx`
- `src/features/teams/team-form-dialog.tsx`
- `src/features/teams/team-members-panel.tsx`
- `src/features/teams/team-projects-panel.tsx`
- `src/features/teams/teams-view.test.tsx`
- `src/features/teams/workload.test.ts`
- `src/features/teams/workload.ts`

## Changed files
- `README.md`
- `src/app/route-manifest.test.ts`
- `src/components/layout/breadcrumbs.tsx`
- `src/features/projects/project-workspace.tsx`
- `src/features/teams/teams-view.tsx`
- `src/lib/breadcrumbs.test.ts`
- `src/lib/breadcrumbs.ts`
- `src/lib/query-keys.ts`
- `src/lib/use-action.test.tsx`
- `src/lib/use-action.ts`

## Removed files
- (none)
