This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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

## Backend contract

The frontend is built against **`zesanahmed/agencyops-api`** and its types were verified from that
repository's source (commit `afe5f62`, 2026-09-28), then exercised end to end against a locally running
copy of the real backend and a real PostgreSQL.

- **Envelope:** success is `{ success, message, data }`; failure is `{ success: false, message, errors: [{ path, message }] }`.
- **Lists:** `data.<plural>` plus `data.pagination` (`organizations`, `members`, `invitations`, `teams`,
  `projects`, `sprints`, `tasks`, `comments`, `notifications`). Maximum page size is 100.
- **Single resources** are nested under their name (`data.organization`, `data.member`, `data.task`, …).
  Creating an invitation returns `inviteToken` *beside* `invitation`.
- **People are IDs, not objects.** Tasks, comments, team/project members and collaborators carry only a
  `membershipId`; names come from the *member directory* (`features/members/use-member-directory.ts`).
  Organizations carry no role: the caller's role is found in the members list.
- **Enums:** task status `BACKLOG | TODO | IN_PROGRESS | IN_REVIEW | DONE`; project status ends in
  `CANCELLED`; invitations and role changes accept only `MANAGER | TEAM_MEMBER`.
- **Search/filter support differs per endpoint** (projects and tasks have `search`; teams, members,
  sprints and invitations take only `page`/`limit`), so the UI only offers filters the backend honours.
- **Permissions** mirror `src/modules/rbac/permissions.ts` in `src/lib/rbac.ts` (UI only; the backend is
  authoritative). `src/lib/rbac.test.ts` and `src/lib/api/contract.test.ts` pin both to the backend.
- **No CORS** is configured on the backend, and the refresh cookie is `SameSite=Strict` with path
  `/api/v1/auth`, so the browser talks to the backend through this app's same-origin `/api/v1` rewrite
  (`BACKEND_ORIGIN`, fixed at build time).

If the backend changes a shape, update `src/types/domain.ts`, `src/lib/api/mappers.ts` and the contract
tests together. `npm run probe:api` prints the live response shapes to check for drift.

