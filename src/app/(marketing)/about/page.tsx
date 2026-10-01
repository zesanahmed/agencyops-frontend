import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Why AgencyOps exists and the principles behind how it's built.",
  openGraph: { title: "About AgencyOps", description: "Why AgencyOps exists and how it's built." },
};

const PRINCIPLES = [
  { title: "Tenant isolation is non-negotiable", body: "Every organization-scoped request is checked on the server against the caller's membership. A guessed ID never reaches another agency's data." },
  { title: "The server decides permissions", body: "The interface hides what you can't do, but the backend is the authority. A hidden button is convenience, never security." },
  { title: "Sessions you can trust", body: "Short-lived access tokens, rotating refresh tokens in HttpOnly cookies, and reuse detection that revokes a stolen session." },
  { title: "Clarity over decoration", body: "Status, priority and ownership are visible at a glance, and never conveyed by colour alone." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">About</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Built for agencies that ship for other people.</h1>
      <div className="mt-6 space-y-4 text-lg text-muted-foreground">
        <p>Small software agencies juggle several clients at once, with a handful of people moving between projects. Generic task boards don&apos;t model that — organizations, teams, roles and sprints are afterthoughts.</p>
        <p>AgencyOps starts from that structure. The organization is the boundary, roles are per organization, and every task sits inside a project, a team and a conversation.</p>
      </div>
      <h2 className="mt-14 text-xl font-semibold tracking-tight">Principles</h2>
      <dl className="mt-6 space-y-6">
        {PRINCIPLES.map((p) => (<div key={p.title} className="border-l-2 border-primary pl-4"><dt className="font-medium">{p.title}</dt><dd className="mt-1 text-sm text-muted-foreground">{p.body}</dd></div>))}
      </dl>
    </div>
  );
}
