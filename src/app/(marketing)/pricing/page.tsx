import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing",
  description: "AgencyOps has a Free plan and a Pro plan. Owners upgrade from Settings; payments are handled by Stripe.",
  openGraph: { title: "AgencyOps pricing", description: "A Free plan to start and a Pro plan with unlimited members and projects." },
};

const EVERYTHING = [
  "Teams, projects, sprints and tasks",
  "Owner, manager and team-member roles",
  "Comments with mentions and the notification inbox",
  "Client portal, shared files and requests",
  "Invoices your clients can pay by card",
];

const PLANS = [
  { id: "free", name: "Free", blurb: "Everything above, for getting started.", limit: "Listed limit: 5 members and 3 projects", cta: { href: "/register", label: "Create your workspace" }, variant: "secondary" as const },
  { id: "pro", name: "Pro", blurb: "The same features with no member or project limit.", limit: "Unlimited members and projects", cta: { href: "/register", label: "Start free, upgrade later" }, variant: "primary" as const },
];

const FAQ = [
  { q: "How do I upgrade?", a: "The organization owner opens Settings, then Plan & billing, and chooses Upgrade to Pro. Checkout is hosted by Stripe; you never type card details into AgencyOps." },
  { q: "Who can change the plan?", a: "Only the owner. Managers can see which plan the organization is on." },
  { q: "Are the Free plan limits enforced?", a: "Not yet. The limits are listed for the Free plan, but the current release does not block anyone from adding members or projects." },
  { q: "Is this live billing?", a: "Payments in this deployment run in Stripe's test mode. Use the test card 4242 4242 4242 4242 with any future date and CVC; no real money moves." },
  { q: "How do my clients pay?", a: "Each client contact opens an invoice in the client portal and pays by card through Stripe. The invoice turns to paid only after Stripe confirms the payment to our server." },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Pricing</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Start free. Upgrade when you outgrow it.</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Both plans include every feature. Pro removes the member and project limits.</p>

      <ul className="mt-6 grid gap-x-8 gap-y-2 sm:grid-cols-2" aria-label="Included in every plan">
        {EVERYTHING.map((i) => <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{i}</li>)}
      </ul>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {PLANS.map((p) => (
          <section key={p.id} aria-labelledby={`${p.id}-h`} className="flex flex-col rounded-lg border border-border-strong bg-surface p-6">
            <h2 id={`${p.id}-h`} className="text-lg font-semibold">{p.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{p.blurb}</p>
            <p className="mt-4 text-sm font-medium">{p.limit}</p>
            <Button asChild variant={p.variant} className="mt-6 w-full"><Link href={p.cta.href}>{p.cta.label}</Link></Button>
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Prices are set in Stripe by whoever runs the deployment and are shown on Stripe&apos;s checkout page, not here.</p>

      <h2 className="mt-16 text-xl font-semibold tracking-tight">Questions</h2>
      <dl className="mt-6 space-y-6">{FAQ.map((f) => <div key={f.q}><dt className="font-medium">{f.q}</dt><dd className="mt-1 text-sm text-muted-foreground">{f.a}</dd></div>)}</dl>
    </div>
  );
}
