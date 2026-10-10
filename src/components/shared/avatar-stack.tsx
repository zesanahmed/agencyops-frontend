import { Avatar } from "@/components/ui/avatar";

/** Overlapping avatars with a "+N" overflow, for compact member lists. */
export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span className="flex items-center" role="group" aria-label={`${names.length} ${names.length === 1 ? "member" : "members"}`}>
      {shown.map((n, i) => <Avatar key={`${n}-${i}`} name={n} size="sm" className="-ml-2 ring-2 ring-surface first:ml-0" />)}
      {extra > 0 ? <span className="ml-1.5 text-xs text-muted-foreground">+{extra}</span> : null}
    </span>
  );
}
