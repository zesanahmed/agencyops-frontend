"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserPlus, UsersRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RoleBadge } from "@/components/shared/role-badge";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { projectApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";

export function ProjectPeople({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  const key = ["organizations", o, "projects", projectId, "members"];
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: key, queryFn: () => projectApi.members(o, projectId) });
  const directory = useMemberDirectory(o);
  const [pick, setPick] = useState("");
  const add = useAction({ fn: (m: string) => projectApi.addMember(o, projectId, m), invalidate: [key], success: "Member added to project" });
  const remove = useAction({ fn: (id: string) => projectApi.removeMember(o, projectId, id), invalidate: [key], success: "Member removed" });

  if (isLoading) return <Skeleton className="h-40" />;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load project members" />;

  const inProject = new Set(data?.map((m) => m.membershipId));
  const candidates = directory.list.filter((m) => !inProject.has(m.id));

  return (
    <div className="space-y-4">
      <Can permission="project:manage-members">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Select aria-label="Organization member to add" value={pick} onChange={(e) => setPick(e.target.value)} className="sm:max-w-xs">
            <option value="">Add a member…</option>
            {candidates.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          <Button disabled={!pick} loading={add.isPending} onClick={() => add.mutate(pick, { onSuccess: () => setPick("") })}><UserPlus /> Add</Button>
        </div>
      </Can>
      {!data?.length ? (
        <EmptyState icon={UsersRound} title="No one is on this project yet" description="Add organization members so they can see and work on its tasks." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {data.map((pm) => {
            const person = directory.byId.get(pm.membershipId);
            const name = person?.name ?? "Former member";
            return (
              <li key={pm.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={name} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{person?.email ?? ""}</p></div>
                {person ? <RoleBadge role={person.role} /> : null}
                <Can permission="project:manage-members"><Button variant="ghost" size="icon" aria-label={`Remove ${name}`} onClick={() => remove.mutate(pm.id)}><X /></Button></Can>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
