import { cn } from "@/lib/utils";

export function StatCard({ label, value, hint, tone }: { label: string; value: number | string; hint?: string; tone?: "danger" }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "danger" && Number(value) > 0 && "text-danger")}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
