# CHANGES — Phase M (final QA, accuracy, documentation, deployment readiness)

Builds on Phase L2. Backend verified at `agencyops-api` `08f0b20`.

## Fixed
- **The production build was broken.** The four old portal stub pages (`src/app/client/page.tsx`, `projects/page.tsx`, `invoices/page.tsx`,
  `files/page.tsx`) were still in the repo next to their replacements in `client/(portal)/`, so `next build` failed with "two parallel
  pages resolve to the same path". They are deleted here; a Vercel deploy would have failed.
- **Public pages described a product that no longer existed.** Home, Product and Pricing still said the client portal was "coming",
  that nothing collects payment and that invoices were planned. All rewritten to match what ships (Free/Pro, Stripe test mode, client
  portal, attachments, activity, invoices). `marketing-content.test.tsx` now guards against those stale claims coming back.
- Missing skeletons: the projects list (staff and portal) used a generic parent skeleton; each now has its own `loading.tsx`.
- No error boundary inside the client portal: added `client/(portal)/error.tsx` (a crash stays inside the portal shell).

## Added
- **Billing at a glance** chart on the organization overview (Recharts): paid / awaiting payment / draft totals for owners and managers.
  Never mixes currencies, ignores void invoices, says when it is partial.
- **Accessibility suite** (`axe-core`, WCAG 2 A/AA) over the public pages, 404 and the sign-in/registration/forgot-password/portal forms.
  New dev dependency: `axe-core` (run `npm install`).
- **Documentation:** a real `README.md` (overview, demo accounts, roles and enforcement, architecture, scripts, env, limitations),
  `DEPLOYMENT.md` (backend + Vercel + Stripe webhook + a 10-step smoke test), `DEMO.md` (a timed script for the walkthrough video),
  `ASSIGNMENT_CHECKLIST.md` (every requirement with evidence, and the items only you can finish), and `docs/BACKEND_CONTRACT.md`
  (the API notes moved out of the README, with the places where the backend's docs and code disagree).

## Delete these files (a ZIP can't remove files)
```
git rm src/app/client/page.tsx src/app/client/projects/page.tsx src/app/client/invoices/page.tsx src/app/client/files/page.tsx
```

## Tests
614 -> 644 (billing summary, accessibility, marketing-copy guard, new loading boundaries).
