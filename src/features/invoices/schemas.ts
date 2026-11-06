import { z } from "zod";
import { MAX_CENTS, parseMoneyToCents } from "@/lib/money";
import { lineAmountCents, previewTotals } from "./invoice-math";

// Mirrors invoice.validation.ts: description 1–500, quantity int 1–100000, unit price 0–MAX_CENTS, ≥1 and ≤50 items,
// 3-letter currency, tax/discount cents ≥ 0, notes ≤ 5000, dueDate not before issueDate. Prices are typed as decimal strings.
export const CURRENCIES = ["usd", "eur", "gbp", "cad", "aud", "sgd", "inr"] as const;

const money = (label: string) => z.string().trim().refine((v) => { const c = parseMoneyToCents(v === "" ? "0" : v); return c !== null && c <= MAX_CENTS; }, `${label} must be an amount like 120 or 120.50`);

export const lineSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500, "Description is too long"),
  quantity: z.string().trim().refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100_000, "Whole number, 1 to 100,000"),
  unitPrice: z.string().trim().refine((v) => { const c = parseMoneyToCents(v); return c !== null && c <= MAX_CENTS; }, "Enter a price like 120 or 120.50"),
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Choose a client"),
  projectId: z.string(),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().regex(/^[a-z]{3}$/, "Choose a currency"),
  items: z.array(lineSchema).min(1, "Add at least one line item").max(50, "At most 50 line items"),
  tax: money("Tax"),
  discount: money("Discount"),
  notes: z.string().trim().max(5000, "Notes are too long"),
}).superRefine((v, ctx) => {
  if (v.issueDate && v.dueDate && v.dueDate < v.issueDate) ctx.addIssue({ code: "custom", path: ["dueDate"], message: "Due date can't be before the issue date" });
  const t = previewTotals(v.items, v.tax, v.discount);
  if (t.error && v.items.every((l) => lineAmountCents(l) !== null)) ctx.addIssue({ code: "custom", path: ["discount"], message: t.error });
});
export type InvoiceValues = z.infer<typeof invoiceSchema>;
export type InvoiceLineValues = z.infer<typeof lineSchema>;

/** Fields validated when leaving each wizard step. */
export const STEP_FIELDS = [
  ["clientId", "projectId", "issueDate", "dueDate", "currency"],
  ["items", "tax", "discount"],
  ["notes"],
] as const;
