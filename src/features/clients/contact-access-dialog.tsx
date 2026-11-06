"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { useOrg } from "@/features/organizations/org-context";
import type { ClientContact } from "@/types/domain";
import { useClientProjects, useContactAccess, useGrantAccess, useRevokeAccess } from "./hooks";

/** Which of the client's linked projects one contact may see in the portal. Contacts see nothing until granted. */
export function ContactAccessDialog({ clientId, contact, canManage, onClose }: { clientId: string; contact: ClientContact | null; canManage: boolean; onClose: () => void }) {
  const { organizationId: o } = useOrg();
  const id = contact?.id ?? "";
  const projects = useClientProjects(o, clientId);
  const access = useContactAccess(o, clientId, id, !!contact);
  const grant = useGrantAccess(o, clientId, id);
  const revoke = useRevokeAccess(o, clientId, id);
  if (!contact) return null;
  const granted = new Set((access.data ?? []).map((a) => a.projectId));
  const busy = grant.isPending || revoke.isPending;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader title={`Portal access for ${contact.name}`} description="Only projects linked to this client can be shared. Invoices linked to a project follow the same access." />
        {projects.isLoading || access.isLoading ? <div className="space-y-2" role="status" aria-label="Loading access">{[0, 1].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          : projects.isError || access.isError ? <ErrorState error={projects.error ?? access.error} onRetry={() => { void projects.refetch(); void access.refetch(); }} title="Couldn't load access" />
          : !projects.data?.length ? <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No projects are linked to this client yet. Link one from the Projects tab first.</p>
          : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {projects.data.map((p) => {
                const has = granted.has(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.name}</p><div className="mt-0.5"><ProjectStatusBadge status={p.status} /></div></div>
                    {canManage ? (
                      <Button size="sm" variant={has ? "secondary" : "primary"} disabled={busy} aria-label={`${has ? "Revoke access to" : "Grant access to"} ${p.name}`} onClick={() => (has ? revoke : grant).mutate(p.id)}>{has ? "Revoke" : "Grant access"}</Button>
                    ) : <span className="text-xs text-muted-foreground">{has ? "Has access" : "No access"}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        <div className="mt-5 flex justify-end"><Button variant="secondary" onClick={onClose}>Close</Button></div>
      </DialogContent>
    </Dialog>
  );
}
