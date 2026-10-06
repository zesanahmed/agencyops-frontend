# CHANGES — Phase D (Organization / RBAC) and backend contract synchronization

Compared with the previous ZIP (`agencyops-frontend-phase-c-fix.zip`, sandbox commit `49d9fbe`).
If your GitHub `main` is still at the Phase B commit, `git diff` will also show the Phase C and
Phase C-fix changes, and will correct two files that differ from the delivered Phase B
(`src/app/(app)/organizations/[organizationId]/page.tsx` and its `loading.tsx` were copies of the
project pages on `main`).

## Summary
- **Verified contract sync.** Types, mappers, pagination, services, enums and validation limits now match the
  real backend (`zesanahmed/agencyops-api`, commit `afe5f62`). Lists read `data.<plural>` + `data.pagination`;
  people are `membershipId`s resolved through a new member directory; organizations carry no role.
- **Permission matrix mirrors the backend** (`resource:action` names). Managers can no longer see owner-only
  actions; the OWNER row is protected; invitations/role changes only offer MANAGER / TEAM_MEMBER.
- **Members & invitations rewritten**: derived invitation status, invite link from `inviteToken`, wrong-account
  protection on the invite page, register-with-`?next` so invitees return to the invite.
- **Fixes found by running against the real backend**: Settings role loading state, notification preferences
  (lazy rows, correct field names), teams search (backend has none; now client-side), 403 refreshes cached role,
  delete flows no longer flash a 404.
- **Tests**: 66 -> 119 (contract tests, role-aware UI tests for all three roles, directory, invite flow, route manifest).

## New files
- `src/app/route-manifest.test.ts`
- `src/features/invitations/invite-view.test.tsx`
- `src/features/members/members-view.test.tsx`
- `src/features/members/use-member-directory.test.tsx`
- `src/features/members/use-member-directory.ts`
- `src/features/settings/preferences.test.ts`
- `src/features/settings/preferences.ts`
- `src/lib/api/contract.test.ts`
- `src/lib/auth/safe-next.test.ts`
- `src/lib/auth/safe-next.ts`
- `src/lib/query-keys.ts`
- `src/lib/use-action.test.tsx`

## Changed files
- `README.md`
- `scripts/probe-api.mjs`
- `src/app/(app)/organizations/[organizationId]/page.tsx`
- `src/app/(app)/organizations/[organizationId]/projects/page.tsx`
- `src/app/(auth)/register/page.tsx`
- `src/components/layout/org-guard.tsx`
- `src/components/shared/status-badge.tsx`
- `src/features/auth/auth-provider.test.tsx`
- `src/features/auth/login-form.tsx`
- `src/features/auth/profile-view.tsx`
- `src/features/auth/register-form.test.tsx`
- `src/features/auth/register-form.tsx`
- `src/features/auth/schemas.ts`
- `src/features/dashboard/my-work-view.tsx`
- `src/features/dashboard/overview.tsx`
- `src/features/dashboard/use-org-work.ts`
- `src/features/dashboard/work-distribution-chart.tsx`
- `src/features/invitations/invite-view.tsx`
- `src/features/members/members-view.tsx`
- `src/features/notifications/notifications-view.tsx`
- `src/features/organizations/hooks.ts`
- `src/features/organizations/org-context.tsx`
- `src/features/organizations/organization-list.tsx`
- `src/features/organizations/schemas.ts`
- `src/features/projects/hooks.ts`
- `src/features/projects/project-list.tsx`
- `src/features/projects/project-people.tsx`
- `src/features/projects/project-workspace.tsx`
- `src/features/projects/schemas.ts`
- `src/features/settings/settings-view.tsx`
- `src/features/sprints/sprint-panel.tsx`
- `src/features/tasks/create-task-dialog.tsx`
- `src/features/tasks/hooks.ts`
- `src/features/tasks/schemas.ts`
- `src/features/tasks/task-detail.tsx`
- `src/features/tasks/task-list.tsx`
- `src/features/teams/teams-view.tsx`
- `src/lib/api/mappers.ts`
- `src/lib/api/pagination.test.ts`
- `src/lib/api/pagination.ts`
- `src/lib/api/services/index.ts`
- `src/lib/rbac.test.ts`
- `src/lib/rbac.ts`
- `src/lib/use-action.ts`
- `src/types/domain.ts`

## Removed files
- `src/lib/api/mappers.test.ts`
