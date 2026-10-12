export function TaskField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>{children}</div>;
}
