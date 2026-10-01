import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";

export function PendingFeature({ icon: Icon, title, description, summary, plans }: { icon: LucideIcon; title: string; description: string; summary: string; plans: string[] }) {
  return (
    <>
      <PageHeader title={title} description={description} actions={<Badge tone="warning">Not available yet</Badge>} />
      <section className="rounded-lg border border-dashed border-border-strong bg-surface p-8">
        <span className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-surface-muted text-muted-foreground"><Icon className="size-5" aria-hidden /></span>
        <p className="max-w-xl text-sm text-muted-foreground">{summary}</p>
        <h2 className="mt-6 text-xs font-medium uppercase tracking-wider text-muted-foreground">Planned</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{plans.map((p) => <li key={p}>{p}</li>)}</ul>
      </section>
    </>
  );
}
