import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, FolderKanban, ListChecks, MessagesSquare, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Product",
  description: "Teams, projects, sprints, tasks and conversations — what AgencyOps gives a software agency.",
  openGraph: { title: "AgencyOps product", description: "Teams, projects, sprints, tasks and conversations." },
};

const FEATURES = [
  { icon: UsersRound, title: "Teams and members", body: "Organize people into teams, assign teams to projects, and manage each member's role. Invite by link; accepting needs the invited email to match." },
  { icon: FolderKanban, title: "Project workspaces", body: "Every project has a status, a people list and its own tasks and sprints. Search, filter and sort project lists, and share the exact view by URL." },
  { icon: CalendarRange, title: "Sprints", body: "Plan a sprint with a goal and dates, start it, complete it. Only planned sprints can be deleted, so history stays honest." },
  { icon: ListChecks, title: "Tasks with depth", body: "Priority, status, assignee, collaborators and one level of subtasks. Filter by status and priority without losing your place." },
  { icon: MessagesSquare, title: "Comments and mentions", body: "Discuss the work where it lives. Authors edit their own comments; owners and managers can moderate." },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl space-y-3">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Product</p>
        <h1 className="text-4xl font-semibold tracking-tight">Everything an agency needs to deliver, nothing it doesn&apos;t.</h1>
        <p className="text-lg text-muted-foreground">A focused set of tools that map to how agencies plan and ship work.</p>
      </div>
      <ul className="mt-12 grid gap-x-10 gap-y-10 md:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.title} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary"><f.icon className="size-5" aria-hidden /></span>
            <div className="space-y-1"><h2 className="font-medium">{f.title}</h2><p className="text-sm text-muted-foreground">{f.body}</p></div>
          </li>
        ))}
      </ul>
      <section className="mt-16 rounded-lg border border-border bg-surface-muted p-6">
        <h2 className="font-medium">Coming next</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">A client portal for project visibility, file sharing, invoicing with online payments, and an AI project assistant are in development. They are not available yet.</p>
      </section>
      <div className="mt-10"><Button asChild size="lg"><Link href="/register">Create your workspace</Link></Button></div>
    </div>
  );
}
