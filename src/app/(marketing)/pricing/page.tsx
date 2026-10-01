import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing",
  description: "How AgencyOps plans will work, and what's included while billing is being built.",
  openGraph: { title: "AgencyOps pricing", description: "How AgencyOps plans will work." },
};

const INCLUDED = [
  "Unlimited organizations you own or belong to",
  "Teams, projects, sprints and tasks",
  "Owner, manager and team-member roles",
  "Invitations, comments with mentions, and the notification inbox",
];

const FAQ = [
  { q: "Is there a paid plan today?", a: "Not yet. Online billing is part of an upcoming release, and prices will be published here before anything is charged." },
  { q: "Will I be charged automatically?", a: "No. Nothing in AgencyOps collects payment at the moment, and you'll always be asked before billing starts." },
  { q: "What happens to my data when billing arrives?", a: "Your organizations, projects and tasks stay exactly as they are." },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Pricing</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Free while we build billing.</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Every current feature is available at no cost. Paid plans and online payments are on the roadmap; we&apos;ll publish real prices here when they&apos;re ready instead of guessing now.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-border-strong bg-surface p-6" aria-labelledby="free-h">
          <h2 id="free-h" className="font-medium">Everything available today</h2>
          <ul className="mt-4 space-y-3">{INCLUDED.map((i) => <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{i}</li>)}</ul>
          <Button asChild className="mt-6 w-full"><Link href="/register">Create your workspace</Link></Button>
        </section>
        <section className="rounded-lg border border-dashed border-border-strong p-6" aria-labelledby="soon-h">
          <h2 id="soon-h" className="font-medium">Planned</h2>
          <p className="mt-1 text-sm text-muted-foreground">Client portal, file sharing, invoices with card payments, and an AI project assistant. Pricing for these will be announced with their release.</p>
        </section>
      </div>
      <h2 className="mt-16 text-xl font-semibold tracking-tight">Questions</h2>
      <dl className="mt-6 space-y-6">{FAQ.map((f) => <div key={f.q}><dt className="font-medium">{f.q}</dt><dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd></div>)}</dl>
    </div>
  );
}
