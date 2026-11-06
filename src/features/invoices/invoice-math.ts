import { MAX_CENTS, parseMoneyToCents } from "@/lib/money";

export interface LineInput { description: string; quantity: string; unitPrice: string }

/** Parses one editable line. Null while the quantity or price isn't a valid number yet. */
export function lineAmountCents(l: Pick<LineInput, "quantity" | "unitPrice">): number | null {
  const q = Number(l.quantity);
  const unit = parseMoneyToCents(l.unitPrice);
  if (!Number.isInteger(q) || q < 1 || q > 100_000 || unit === null) return null;
  return q * unit;
}

/**
 * Same formula as the backend's computeTotals (invoice.service.ts): total = subtotal - discount + tax. The server always
 * recomputes, so this is only a live preview; `error` mirrors its 422 cases so they show before submitting.
 */
export function previewTotals(lines: LineInput[], taxInput: string, discountInput: string): { subtotalCents: number; taxCents: number; discountCents: number; totalCents: number; error: string | null } {
  const tax = parseMoneyToCents(taxInput || "0");
  const discount = parseMoneyToCents(discountInput || "0");
  let subtotal = 0;
  for (const l of lines) subtotal += lineAmountCents(l) ?? 0;
  const t = tax ?? 0, d = discount ?? 0;
  const total = subtotal - d + t;
  const error = total < 0 ? "Discount cannot exceed the invoice amount" : subtotal > MAX_CENTS || total > MAX_CENTS ? "Invoice total is too large" : null;
  return { subtotalCents: subtotal, taxCents: t, discountCents: d, totalCents: total, error };
}
