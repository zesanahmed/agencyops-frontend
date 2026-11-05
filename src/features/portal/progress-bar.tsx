import { cn } from "@/lib/utils";

/** Labelled progress. The number is always shown as text too, never colour/width alone. */
export function ProgressBar({ percent, label, className }: { percent: number; label: string; className?: string }) {
  const v = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className={cn("space-y-1", className)}>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${v}%` }} />
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">{v}% complete</p>
    </div>
  );
}
