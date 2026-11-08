import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Building2, CalendarRange, CreditCard, FolderKanban, ListChecks, MessagesSquare, Paperclip, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Product",
  description: "Teams, projects, sprints, tasks, a client portal, file sharing and invoices with card payments: what AgencyOps gives a software agency.",
  openGraph: { title: "AgencyOps product", description: "Delivery tools for your team and a portal, files and invoices for your clients." },
};

const FEATURES = [
  { icon: UsersRound, title: "Teams and members", body: "Organize people into teams, assign teams to projects, and manage each member's role. Invite by link; accepting needs the invited email to match." },
  { icon: FolderKanban, title: "Project workspaces", body: "Every project has a status, a people list and its own tasks and sprints. Search, filter and sort project lists, and share the exact view by URL." },
  { icon: CalendarRange, title: "Sprints", body: "Plan a sprint with a goal and dates, start it, complete it. Only planned sprints can be deleted, so history stays honest." },
  { icon: ListChecks, title: "Tasks with depth", body: "Priority, status, assignee, collaborators and one level of subtasks. Filter by status and priority without losing your place." },
  { icon: MessagesSquare, title: "Comments and mentions", body: "Discuss the work where it lives. Authors edit their own comments; owners and managers can moderate." },
  { icon: Paperclip, title: "Attachments", body: "Attach images, PDFs, Word, Excel and text files (up to 10 MB) to a task, with a preview and upload progress. The server checks each file's real type." },
  { icon: Activity, title: "Activity feed", body: "See what changed across projects, sprints and tasks, newest first. Owners and managers see everything; team members see the projects they belong to." },
  { icon: Building2, title: "Clients and a separate portal", body: "Add client companies and their contacts, link projects, and grant each contact access project by project. Contacts sign in to their own portal, never as team members." },
  { icon: CreditCard, title: "Invoices and card payments", body: "Build an invoice in three steps, send it, and the client pays through Stripe. Payment is confirmed by the provider's signed notification, never by a browser redirect." },
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
        <h2 className="font-medium">What the client sees</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Project progress, the tasks you share, your updates, a message thread, shared files, their own requests and their invoices. Nothing else: no assignees, no internal comments, no other client&apos;s data.</p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Not part of this release: an AI project assistant.</p>
      </section>
      <div className="mt-10"><Button asChild size="lg"><Link href="/register">Create your workspace</Link></Button></div>
    </div>
  );
}
