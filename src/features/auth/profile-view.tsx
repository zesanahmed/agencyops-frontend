"use client";

import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { useOrganizations } from "@/features/organizations/hooks";
import { useAuth } from "./auth-provider";
import Link from "next/link";

export function ProfileView() {
  const { user, logout, logoutAll } = useAuth();
  const orgs = useOrganizations();
  return (
    <>
      <PageHeader title="Profile" description="Your account across all organizations." />
      <div className="space-y-8">
        <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
          <Avatar name={user?.name || user?.email || "?"} size="lg" />
          <div className="min-w-0"><p className="truncate font-medium">{user?.name}</p><p className="truncate text-sm text-muted-foreground">{user?.email}</p></div>
        </div>
        <p className="text-xs text-muted-foreground">Profile editing isn&apos;t available yet — the backend exposes no account-update endpoint.</p>
        <section aria-labelledby="mem-h" className="space-y-2">
          <h2 id="mem-h" className="text-sm font-semibold">Your memberships</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {orgs.data?.items.map((o) => <li key={o.id}><Link href={`/organizations/${o.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-muted"><span className="truncate text-sm">{o.name}</span></Link></li>)}
            {!orgs.data?.items.length ? <li className="px-4 py-3 text-sm text-muted-foreground">{orgs.isLoading ? "Loading…" : "No organizations yet."}</li> : null}
          </ul>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => logout().catch(() => toast.error("Signed out locally; the server could not be reached."))}>Sign out</Button>
          <Button variant="ghost" onClick={() => logoutAll().catch(() => toast.error("Signed out locally; the server could not be reached."))}>Sign out everywhere</Button>
        </div>
      </div>
    </>
  );
}
