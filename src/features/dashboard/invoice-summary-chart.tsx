"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import type { InvoiceSummary } from "./invoice-summary";

/** Answers one question: how much have we billed, collected and not yet collected? */
export function InvoiceSummaryChart({ summary }: { summary: InvoiceSummary }) {
  const data = [
    { name: "Paid", cents: summary.paidCents, fill: "var(--success)" },
    { name: "Awaiting payment", cents: summary.awaitingCents, fill: "var(--warning)" },
    { name: "Draft", cents: summary.draftCents, fill: "var(--border-strong)" },
  ];
  const label = data.map((d) => `${d.name}: ${formatMoney(d.cents, summary.currency)}`).join(", ");
  return (
    <div role="img" aria-label={`Invoice totals by status. ${label}`} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickFormatter={(v: number) => formatMoney(v, summary.currency).replace(/\.00$/, "")} />
          <Tooltip cursor={{ fill: "var(--surface-muted)" }} formatter={(v) => formatMoney(Number(v), summary.currency)} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="cents" name="Amount" radius={[4, 4, 0, 0]}>{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
