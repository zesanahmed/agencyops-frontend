# CHANGES — Phase J (account & security)

Builds on Phase I. Backend verified at `agencyops-api` `08f0b20`.

## New pages
- `/forgot-password` and `/reset-password?token=` (single-use link; an invalid/expired token turns into "request a new link").
- `/verify-email?token=` (the token is spent exactly once, even under React strict mode).
- `/oauth/callback` (Google/GitHub round-trip landing page, with a message for each backend error code).
- `/invitations/accept?token=`: the backend e-mails this path for organization invitations, but the app's page is
  `/invite/[token]`; this redirects, so invitation e-mails no longer 404.

## Changed
- **Profile** is now a real account page: verified badge + resend, change password, active sessions (this device labelled,
  sign out the others), sign out / sign out everywhere, delete account (type DELETE; password optional for OAuth-only users;
  the backend's 409 "you still own an organization" is shown as-is).
- **Login** gets "Forgot password?" and, when enabled, Google/GitHub buttons; **Register** gets the same buttons.
- **Unverified-e-mail banner** under the top bar (soft nudge: the backend blocks nothing on it).
- **Bug fix:** the password rule was 8–128; the backend allows 8–72 characters and ≤72 UTF-8 bytes. A 100-character password
  used to pass the form and fail on the server. Now validated identically on every password form.
- `api.delete` can carry a body (account deletion); `User` gains `emailVerifiedAt`; `.env.example` documents
  `NEXT_PUBLIC_OAUTH_PROVIDERS`.

## Tests
333 -> 385 (account flows, schemas incl. the UTF-8 byte rule, account contract, session labels, OAuth buttons).

## Notes
- OAuth only works once the backend has provider credentials and `API_PUBLIC_URL` equals this site's origin (see README).
- Reset/verify e-mails are sent by the backend's Resend integration; demo users never receive e-mail.
