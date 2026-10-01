import { cn } from "@/lib/utils";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toUpperCase();
}

/** Deterministic tint from a fixed, restrained set (neutral-first, no rainbow). */
const TINTS = ["bg-primary-soft text-primary", "bg-info-soft text-info", "bg-warning-soft text-warning", "bg-success-soft text-success", "bg-surface-muted text-foreground"];
function tint(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span role="img" aria-label={name} title={name}
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium", tint(name),
        size === "sm" && "size-6 text-[10px]", size === "md" && "size-8 text-xs", size === "lg" && "size-11 text-sm", className)}>
      {initials(name)}
    </span>
  );
}
