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

