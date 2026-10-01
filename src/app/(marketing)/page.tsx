import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, AtSign, Bell, ShieldCheck } from "lucide-react";
import { Hierarchy } from "@/components/marketing/hierarchy";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: "AgencyOps — Operations for software agencies" },
  description: "Organizations, teams, projects, sprints and tasks in one calm workspace, with roles that match how agencies actually work.",
  openGraph: { title: "AgencyOps — Operations for software agencies", description: "One workspace for teams, projects, sprints and tasks." },
};

const PILLARS = [
  { icon: ShieldCheck, title: "Roles per organization", body: "Owner, manager and team member are set per organization, so the same person can lead one agency workspace and contribute in another." },
  { icon: AtSign, title: "Conversation on the work", body: "Comment on a task and mention the people who need to see it. They get notified in the inbox, tied to that task." },
  { icon: Bell, title: "An inbox that keeps up", body: "Unread state is obvious, everything can be marked read at once, and you choose which events reach your email." },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:py-24">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">For small software agencies</p>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">Know what&apos;s moving, what&apos;s stuck, and who owns it.</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            AgencyOps is where an agency runs its delivery: teams assigned to projects, projects broken into sprints, sprints into tasks — each with an owner, a priority and a conversation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/register">Create your workspace <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/login">Try the demo login</Link></Button>
          </div>
        </div>
        <Hierarchy />
      </section>

      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">Agency work gets lost between tools.</h2>
            <p className="text-muted-foreground">Status lives in one place, assignments in a chat thread, and decisions in someone&apos;s inbox. AgencyOps keeps the chain from organization to task in one structure, so the answer to &ldquo;who is on this?&rdquo; is always one click away.</p>
          </div>
          <ul className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((p) => (
              <li key={p.title} className="space-y-2">
                <p.icon className="size-5 text-primary" aria-hidden />
                <h3 className="font-medium">{p.title}</h3>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-border bg-surface p-8 sm:flex-row sm:items-center">
          <div className="space-y-1"><h2 className="text-xl font-semibold tracking-tight">Set up in a few minutes.</h2><p className="text-sm text-muted-foreground">Create an organization, invite your team by link, and add your first project.</p></div>
          <Button asChild size="lg"><Link href="/register">Get started</Link></Button>
        </div>
      </section>
    </>
  );
}
