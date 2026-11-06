# CHANGES — Phase L2 (client portal: collaboration, files, invoices, payment)

Builds on Phase L1. Backend verified at `agencyops-api` `08f0b20`.

## New (all under the client portal)
- **Project page tabs:** Messages (thread, newest page first, "You" for the contact's own), Files (shared list + uploader with
  preview/progress/cancel; contacts can't delete), Requests (their own requests with status and the agency's reply; "New request"
  form with type, title, details).
- **`/client/files`**: pick a project (`?project=`), then the same files list/uploader.
- **`/client/invoices`** and **`/client/invoices/[id]`**: list, line items, totals, PDF link when ready, **Pay** (Stripe Checkout).
  PAID / VOID can't be paid.
- **Overview** flags invoices awaiting payment (count and total, when they share a currency).
- **`/payment/success?type=invoice`** now confirms against the server (polling, FAILED reason + retry, CANCELED, voided,
  30 s "processing" fallback, sign-in prompt when signed out). It runs inside its own portal session provider since the page
  lives outside `/client`.

## Contract notes
- Payment-status query is `session_id` in the backend code (FRONTEND_CONTRACT §4 says `sessionId`); the code wins.

## Tests
586 -> 614 (portal messages/requests/files/invoices, invoice payment confirmation states, L2 contract tests).

## Not covered
Stripe Checkout/webhook, Cloudinary uploads and e-mail were not run against live services; everything is tested against mocked
responses that follow the backend code. The portal path needs your Stripe test keys, the webhook listener and the worker.
