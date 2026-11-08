import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, AtSign, Bell, CreditCard, ShieldCheck, UsersRound as ClientsIcon } from "lucide-react";
import { Hierarchy } from "@/components/marketing/hierarchy";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: { absolute: "AgencyOps — Operations for software agencies" },
  description: "Run delivery with teams, projects, sprints and tasks, then give clients a calm portal to follow progress, share files and pay invoices.",
  openGraph: { title: "AgencyOps — Operations for software agencies", description: "Delivery for your team, visibility and payments for your clients." },
};

const PILLARS = [
  { icon: ShieldCheck, title: "Roles per organization", body: "Owner, manager and team member are set per organization, so the same person can lead one agency workspace and contribute in another." },
  { icon: AtSign, title: "Conversation on the work", body: "Comment on a task and mention the people who need to see it. They get notified in the inbox, tied to that task." },
  { icon: Bell, title: "An inbox that keeps up", body: "Unread state is obvious, everything can be marked read at once, and you choose which events reach your email." },
  { icon: ClientsIcon, title: "A portal for your clients", body: "Clients sign in to a separate, calmer portal: they see only the projects and tasks you share, message you, send requests and files." },
  { icon: CreditCard, title: "Invoices that get paid", body: "Draft an invoice, send it, and the client pays by card through Stripe. An invoice shows as paid only when the payment provider confirms it." },
  { icon: Activity, title: "Activity you can follow", body: "A feed of what changed across projects, sprints and tasks, filtered to the projects each person belongs to." },
];


const STEPS = [
  { n: "01", title: "Set up the agency", body: "Create an organization and invite teammates with a one-time link. Each person joins as an owner, manager or team member." },
  { n: "02", title: "Plan the work", body: "Add a project, assign teams and people, then plan sprints with a goal and a date range." },
  { n: "03", title: "Run delivery", body: "Break sprints into tasks with a priority and an owner. Move them forward, discuss them in comments, and mention who needs to know." },
  { n: "04", title: "Share and get paid", body: "Invite the client's contacts to the portal, share the projects and tasks they should see, then send invoices they can pay online." },
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
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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


      <section className="mx-auto max-w-6xl space-y-10 px-4 py-16 sm:px-6" aria-labelledby="how-h">
        <div className="max-w-2xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-widest text-primary">How it works</p>
          <h2 id="how-h" className="text-2xl font-semibold tracking-tight">From a new workspace to paid invoices in four steps.</h2>
        </div>
        <ol className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((st) => (
            <li key={st.n} className="space-y-2 border-t-2 border-primary pt-4">
              <span className="font-mono text-xs text-muted-foreground">{st.n}</span>
              <h3 className="font-medium">{st.title}</h3>
              <p className="text-sm text-muted-foreground">{st.body}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm"><Link href="/services" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">See everything in the product <ArrowRight className="size-4" /></Link></p>
      </section>

      <section className="border-y border-border bg-surface-muted" aria-labelledby="client-h">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"><ClientsIcon className="size-4" aria-hidden /> Client portal</p>
            <h2 id="client-h" className="text-xl font-semibold tracking-tight">Clients see progress, not your internals.</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">Each client contact gets their own sign-in, separate from your team. They follow only the projects you grant them: progress, the tasks you choose to share, updates, messages, files, invoices. They are never added as internal members, and they never see your assignees, comments or internal discussion.</p>
          </div>
          <Button asChild variant="secondary"><Link href="/client/login">Open the client portal</Link></Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-border bg-surface p-8 sm:flex-row sm:items-center">
          <div className="space-y-1"><h2 className="text-xl font-semibold tracking-tight">Set up in a few minutes.</h2><p className="text-sm text-muted-foreground">Create an organization, invite your team by link, add your first project, then bring in your client.</p></div>
          <div className="flex flex-wrap gap-2"><Button asChild size="lg" variant="secondary"><Link href="/pricing">Pricing</Link></Button><Button asChild size="lg"><Link href="/register">Get started</Link></Button></div>
        </div>
      </section>
    </>
  );
}
