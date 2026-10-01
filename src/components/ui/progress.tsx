import { cn } from "@/lib/utils";

export function Progress({ value, label, className }: { value: number; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progress"}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}>
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${v}%` }} />
    </div>
  );
}
