"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { statusLabel } from "@/components/shared/status-badge";

const STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const;
const COLOR: Record<string, string> = { BACKLOG: "var(--border)", TODO: "var(--border-strong)", IN_PROGRESS: "var(--info)", IN_REVIEW: "var(--warning)", DONE: "var(--success)" };

/** Answers one question: where is the work sitting right now? */
export function WorkDistributionChart({ counts }: { counts: Record<string, number> }) {
  const data = STATUSES.map((s) => ({ status: statusLabel.task(s), key: s, count: counts[s] ?? 0 }));
  const summary = data.map((d) => `${d.status}: ${d.count}`).join(", ");
  return (
    <div role="img" aria-label={`Tasks by status. ${summary}`} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="status" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
          <Tooltip cursor={{ fill: "var(--surface-muted)" }} contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="count" name="Tasks" radius={[4, 4, 0, 0]}>{data.map((d) => <Cell key={d.key} fill={COLOR[d.key]} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
