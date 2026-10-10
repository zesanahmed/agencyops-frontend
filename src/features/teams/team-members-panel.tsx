"use client";

import { UserX, UsersRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { RoleBadge } from "@/components/shared/role-badge";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { Can, useOrg } from "@/features/organizations/org-context";
import type { Team } from "@/types/domain";
import { useAddTeamMember, useRemoveTeamMember, useTeamMembers } from "./hooks";

export function TeamMembersPanel({ team, openTasks, workloadLoading }: { team: Team; openTasks: Map<string, number>; workloadLoading: boolean }) {
  const { organizationId: o } = useOrg();
  const { data, isLoading, isError, error, refetch } = useTeamMembers(o, team.id);
  const directory = useMemberDirectory(o);
  const add = useAddTeamMember(o, team.id);
  const remove = useRemoveTeamMember(o, team.id);

  if (isLoading || directory.isLoading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load team members" />;

  const inTeam = new Set(data?.map((m) => m.membershipId));
  const candidates = directory.list.filter((m) => !inTeam.has(m.id));

  return (
    <div className="space-y-4">
      <Can permission="team:manage-members">
        <Select aria-label={`Add member to ${team.name}`} value="" disabled={add.isPending || !candidates.length} onChange={(e) => e.target.value && add.mutate(e.target.value)} className="sm:max-w-xs">
          <option value="">{candidates.length ? "Add a member…" : "Everyone is already on this team"}</option>
          {candidates.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      </Can>

      {!data?.length ? (
        <EmptyState icon={UsersRound} title="No members yet" description="Add people so this team can be assigned work and shown on projects." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {data.map((tm) => {
            const person = directory.byId.get(tm.membershipId);
            const name = person?.name ?? "Former member";
            const count = openTasks.get(tm.membershipId) ?? 0;
            return (
              <li key={tm.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {person ? <Avatar name={name} /> : <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface-muted text-muted-foreground"><UserX className="size-4" aria-hidden /></span>}
                <div className="min-w-0 flex-1 basis-44">
                  <p className={`truncate text-sm font-medium ${person ? "" : "text-muted-foreground"}`}>{name}</p>
                  <p className="truncate text-xs text-muted-foreground">{person ? person.email : "No longer in this organization"}</p>
                </div>
                {person ? <RoleBadge role={person.role} /> : null}
                <span className="w-24 text-right text-xs tabular-nums text-muted-foreground" aria-label={`${count} open tasks`}>{workloadLoading ? "…" : `${count} open ${count === 1 ? "task" : "tasks"}`}</span>
                <Can permission="team:manage-members"><Button variant="ghost" size="icon" aria-label={`Remove ${name}`} disabled={remove.isPending} onClick={() => remove.mutate(tm.id)}><X /></Button></Can>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
