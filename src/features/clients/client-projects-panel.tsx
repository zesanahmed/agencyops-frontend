"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderKanban, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { useOrg } from "@/features/organizations/org-context";
import { useProjects } from "@/features/projects/hooks";
import type { ClientProject } from "@/types/domain";
import { useClientProjects, useLinkProject, useUnlinkProject } from "./hooks";

/**
 * Projects delivered for this client. A project belongs to at most one client; trying to link one that belongs to
 * another client is refused by the server (409) and shown as a toast.
 */
export function ClientProjectsPanel({ clientId }: { clientId: string }) {
  const { organizationId: o, can } = useOrg();
  const linked = useClientProjects(o, clientId);
  const all = useProjects(o, { limit: 100, sortBy: "name", sortOrder: "asc" });
  const link = useLinkProject(o, clientId);
  const unlink = useUnlinkProject(o, clientId);
  const [pick, setPick] = useState("");
  const [removing, setRemoving] = useState<ClientProject | null>(null);
  const manage = can("client:manage-access");
  const linkedIds = new Set((linked.data ?? []).map((p) => p.id));
  const options = (all.data?.items ?? []).filter((p) => !linkedIds.has(p.id));

  return (
    <div className="space-y-3">
      {manage ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select aria-label="Project to link" value={pick} onChange={(e) => setPick(e.target.value)} className="sm:max-w-xs">
            <option value="">{all.isLoading ? "Loading projects…" : options.length ? "Choose a project…" : "No other projects to link"}</option>
            {options.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Button variant="secondary" disabled={!pick} loading={link.isPending} onClick={() => link.mutate(pick, { onSuccess: () => setPick("") })}><Link2 /> Link project</Button>
        </div>
      ) : null}

      {linked.isLoading ? <div className="space-y-2" role="status" aria-label="Loading projects">{[0, 1].map((i) => <Skeleton key={i} className="h-14" />)}</div>
        : linked.isError ? <ErrorState error={linked.error} onRetry={() => linked.refetch()} title="Couldn't load projects" />
        : !linked.data?.length ? <EmptyState icon={FolderKanban} title="No linked projects" description="Link a project to share its progress with this client's contacts and to invoice against it." />
        : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {linked.data.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/organizations/${o}/projects/${p.id}`} className="truncate text-sm font-medium underline-offset-2 hover:underline">{p.name}</Link>
                  <div className="mt-0.5"><ProjectStatusBadge status={p.status} /></div>
                </div>
                {manage ? <Button size="sm" variant="ghost" onClick={() => setRemoving(p)} aria-label={`Unlink ${p.name}`}><Unlink /> Unlink</Button> : null}
              </li>
            ))}
          </ul>
        )}

      <ConfirmDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)} destructive confirmLabel="Unlink project"
        title={`Unlink ${removing?.name ?? "project"}?`} description="This client's contacts lose access to it in the portal. The project itself is not changed."
        onConfirm={() => removing && unlink.mutateAsync(removing.id)} />
    </div>
  );
}
