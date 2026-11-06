"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { ClientFormDialog } from "./client-form-dialog";
import { ClientProjectsPanel } from "./client-projects-panel";
import { ContactsPanel } from "./contacts-panel";
import { useClient, useDeleteClient } from "./hooks";

const TABS = ["contacts", "projects"] as const;
type Tab = (typeof TABS)[number];

export function ClientDetail({ clientId }: { clientId: string }) {
  const { organizationId: o } = useOrg();
  const router = useRouter();
  const { get, set } = useUrlState();
  const tab: Tab = (TABS as readonly string[]).includes(get("tab")) ? (get("tab") as Tab) : "contacts";
  const q = useClient(o, clientId);
  const del = useDeleteClient(o);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (q.isLoading) return <div className="space-y-4" role="status" aria-label="Loading client"><Skeleton className="h-10 w-72" /><Skeleton className="h-40" /></div>;
  if (q.isError || !q.data) {
    const notFound = q.error instanceof ApiError && q.error.status === 404;
    return <ErrorState error={q.error} onRetry={() => q.refetch()} title={notFound ? "Client not found" : "Couldn't load this client"} />;
  }
  const c = q.data;

  return (
    <>
      <Link href={`/organizations/${o}/clients`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden /> All clients</Link>
      <PageHeader title={c.name} description={`Added ${formatDate(c.createdAt)}`}
        actions={<>
          <Can permission="client:update"><Button variant="secondary" onClick={() => setEditing(true)}><Pencil /> Edit</Button></Can>
          <Can permission="client:delete"><Button variant="ghost" onClick={() => setDeleting(true)} aria-label="Delete client"><Trash2 /></Button></Can>
        </>} />

      {c.website || c.notes ? (
        <div className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-2">
          {c.website ? <p className="flex items-center gap-1.5"><ExternalLink className="size-4 text-muted-foreground" aria-hidden /><a href={c.website} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{c.website}</a></p> : null}
          {c.notes ? <p className="whitespace-pre-wrap text-muted-foreground sm:col-span-2"><span className="font-medium text-foreground">Internal notes: </span>{c.notes}</p> : null}
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "contacts" ? "" : v })}>
        <TabsList><TabsTrigger value="contacts">Contacts</TabsTrigger><TabsTrigger value="projects">Projects</TabsTrigger></TabsList>
        <TabsContent value="contacts"><ContactsPanel clientId={clientId} /></TabsContent>
        <TabsContent value="projects"><ClientProjectsPanel clientId={clientId} /></TabsContent>
      </Tabs>

      <ClientFormDialog mode="edit" client={c} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} destructive confirmLabel="Delete client" title={`Delete ${c.name}?`}
        description="Its contacts are signed out and disabled, their portal access is removed, and linked projects are unlinked (the projects themselves are kept). Existing invoices stay on record."
        onConfirm={async () => { await del.mutateAsync(clientId); router.replace(`/organizations/${o}/clients`); }} />
    </>
  );
}
