/** Money is integer cents everywhere on the wire (`totalCents`); `currency` is a lower-case ISO 4217 code. */

export function formatMoney(cents: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`; // unknown currency code
  }
}

/** "12" | "12.5" | "1,200.50" -> cents. Null for anything else (negative, >2 decimals, text). No floating point involved. */
export function parseMoneyToCents(input: string): number | null {
  const v = input.trim().replace(/,/g, "");
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || 0);
}

/** cents -> "12.50" for an input field. */
export function centsToInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** Backend limit (invoice.validation.ts): stays inside a Postgres INT. */
export const MAX_CENTS = 2_000_000_000;
