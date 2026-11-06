import { formatMoney } from "@/lib/money";

/** Subtotal / discount / tax / total block. The server computes the real figures; the wizard feeds this a preview. */
export function InvoiceTotals({ currency, subtotalCents, discountCents, taxCents, totalCents }: { currency: string; subtotalCents: number; discountCents: number; taxCents: number; totalCents: number }) {
  const row = (label: string, cents: number, sign = "") => (
    <div className="flex justify-between gap-6 text-sm"><dt className="text-muted-foreground">{label}</dt><dd className="tabular-nums">{sign}{formatMoney(cents, currency)}</dd></div>
  );
  return (
    <dl className="ml-auto w-full max-w-xs space-y-1.5">
      {row("Subtotal", subtotalCents)}
      {discountCents > 0 ? row("Discount", discountCents, "−") : null}
      {taxCents > 0 ? row("Tax", taxCents) : null}
      <div className="flex justify-between gap-6 border-t border-border pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(totalCents, currency)}</dd></div>
    </dl>
  );
}
