# Deploying AgencyOps

Two deployables: the **frontend** (this repo, Vercel) and the **backend** ([`agencyops-api`](https://github.com/zesanahmed/agencyops-api): a web service **and a worker**, plus PostgreSQL and Redis). The browser only ever talks to the frontend origin; Next proxies `/api/v1/*` to the backend.

## 1. Backend first

Follow the backend README's *Deployment* section (a `render.yaml` blueprint is included). The settings that matter to this frontend:

| Backend variable | Value | Why |
|---|---|---|
| `FRONTEND_URL` | the frontend origin, e.g. `https://agencyops.vercel.app` (no trailing slash) | e-mailed links and the Stripe success/cancel redirects (`/payment/success`, `/payment/cancel`) are built from it |
| `CORS_ORIGIN` | the same origin | exact match, no trailing slash |
| `TRUST_PROXY` | `1` | otherwise the auth rate limits (10 per 15 min) are shared by **every** user, because the backend only sees the proxy's IP |
| `NODE_ENV` | `production` | `Secure` cookies |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | Stripe **test** keys / price | subscriptions and invoice payments |
| `CLOUDINARY_*` | your Cloudinary credentials | attachments, shared files, invoice PDFs (uploads answer 503 without them) |
| `RESEND_API_KEY` | optional | invitation / reset / verification e-mails. Without it, staff get a copyable invite link and demo users never receive e-mail |

**The worker must be running** (an always-on instance), or invoice PDFs and e-mails never happen.

Cookie note: because the frontend proxies the API, the refresh cookie is set on the *frontend's* origin and the backend can keep `REFRESH_TOKEN_COOKIE_SAME_SITE=strict`. You only need `none` if you point the browser at the backend directly instead (not recommended; it is not how this app is built).

### Stripe webhook

In the Stripe dashboard (test mode) add an endpoint `https://<backend-origin>/api/v1/webhooks/stripe`, point it at the **backend directly** (the signature check needs the raw body), subscribe to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created|updated|deleted`, `invoice.payment_failed`, and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Locally: `stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe`.

> Nothing is ever marked paid because a browser reached a success page. If the webhook isn't reaching the backend, the app will correctly sit on "Payment is processing" and an invoice will stay *Awaiting payment*.

### Demo data

```bash
ALLOW_SEED_IN_PRODUCTION=true npm run seed:built     # in the backend; the demo password is public, so only for a public demo
```
Creates *Brightline Studio* (slug `brightline-studio`) with the Owner / Manager / Team member users, a client contact, projects, sprints, tasks, invoices (paid, open, draft), a client thread and a request. `npm run seed -- --reset` rebuilds it with fresh dates.

## 2. Frontend on Vercel

1. Import the repo. Framework preset: Next.js. Node 20+.
2. Environment variables (Production **and** Preview):

   | Variable | Value |
   |---|---|
   | `BACKEND_ORIGIN` | `https://<your-backend-origin>` — **read at build time**, so set it before the first build and redeploy if it changes |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-frontend-origin>` |

   Leave `NEXT_PUBLIC_API_BASE_URL` unset. Optional: `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_OAUTH_PROVIDERS`, `NEXT_PUBLIC_DEMO_*`.
3. Deploy. `npm run build` must pass locally first (`npm run typecheck && npm run lint && npm test && npm run build`).
4. Put the live URL in the README table and in your submission.

### Optional: Google / GitHub sign-in

Set `NEXT_PUBLIC_OAUTH_PROVIDERS=google,github`, give the backend the provider credentials, set the backend's `API_PUBLIC_URL` to the **frontend** origin (so the whole round trip stays first-party through the proxy) and register `<frontend-origin>/api/v1/auth/oauth/<provider>/callback` with the provider. Skip this entirely if you don't need it; the buttons stay hidden.

## 3. Smoke test after deploying (10 minutes)

| # | Do | Expect |
|---|---|---|
| 1 | open `<backend>/api/v1/health` | `API is healthy` |
| 2 | `/login` → each **Demo login** (Owner, Manager, Team member) | lands in Brightline Studio; sidebar differs per role (Team member has no Invoices) |
| 3 | refresh the page while signed in | still signed in (refresh cookie works through the proxy) |
| 4 | Owner: Settings → **Plan & billing** → Upgrade (skip if already Pro) | Stripe Checkout opens; card `4242 4242 4242 4242`; returns to `/payment/success`, shows "You're on Pro" |
| 5 | Owner: Invoices → New invoice → send it | appears as *Awaiting payment* |
| 6 | `/client/login` → **Demo client login** → Invoices → Pay | Stripe Checkout; pay; `/payment/success?type=invoice` shows "Payment received"; the staff invoice turns *Paid* |
| 7 | decline test: pay with `4000 0000 0000 0002` | "Your payment didn't go through" with the reason and *Try again* |
| 8 | task page → attach a small PNG | progress bar, preview, appears in the list (needs Cloudinary) |
| 9 | Owner: Clients → a contact → Access; task → *Show to client* | the client portal shows that project/task |
| 10 | sign in as staff and client in two tabs; sign out of one | the other stays signed in (separate sessions) |

If step 4 or 6 sticks on "processing", check the Stripe webhook deliveries and that the **backend worker** and `STRIPE_WEBHOOK_SECRET` are set.
