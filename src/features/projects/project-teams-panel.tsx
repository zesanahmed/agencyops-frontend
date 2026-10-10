"use client";

import Link from "next/link";
import { Info, UsersRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarStack } from "@/components/shared/avatar-stack";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useAssignTeam, useProjectTeams, useTeamDirectory, useTeamsMembers, useUnassignTeam } from "@/features/teams/hooks";

/** Teams responsible for a project. Assigning a team does NOT add its people as project members (backend has no such sync). */
export function ProjectTeamsPanel({ projectId }: { projectId: string }) {
  const { organizationId: o } = useOrg();
  const assigned = useProjectTeams(o, projectId);
  const teams = useTeamDirectory(o);
  const people = useMemberDirectory(o);
  const rows = assigned.data ?? [];
  const members = useTeamsMembers(o, rows.filter((r) => teams.exists(r.teamId)).map((r) => r.teamId));
  const assign = useAssignTeam(o);
  const unassign = useUnassignTeam(o);

  if (assigned.isLoading || teams.isLoading) return <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (assigned.isError) return <ErrorState error={assigned.error} onRetry={() => assigned.refetch()} title="Couldn't load this project's teams" />;

  const takenIds = new Set(rows.map((r) => r.teamId));
  const candidates = [...teams.list].filter((t) => !takenIds.has(t.id)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Teams show who is responsible for this project. Assigning one doesn&apos;t add its people to the project; use the People tab for that.
      </p>
      <Can permission="project:manage-teams">
        <Select aria-label="Assign a team" value="" disabled={assign.isPending || !candidates.length} onChange={(e) => e.target.value && assign.mutate({ projectId, teamId: e.target.value })} className="sm:max-w-xs">
          <option value="">{candidates.length ? "Assign a team…" : teams.list.length ? "Every team is assigned" : "No teams yet"}</option>
          {candidates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </Can>

      {!rows.length ? (
        <EmptyState icon={UsersRound} title="No teams assigned" description="Assign the teams responsible for this project so everyone can see who owns it." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {rows.map((r) => {
            const exists = teams.exists(r.teamId);
            const name = teams.nameOf(r.teamId);
            const list = members.byTeam.get(r.teamId);
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 basis-44">
                  {exists ? <Link href={`/organizations/${o}/teams/${r.teamId}`} className="truncate text-sm font-medium hover:underline">{name}</Link> : <span className="text-sm font-medium text-muted-foreground">{name}</span>}
                  {!exists ? <p className="text-xs text-muted-foreground">This team was deleted. Unassign it to clean up.</p> : null}
                </div>
                {exists ? (list ? (list.length ? <AvatarStack names={list.map((m) => people.nameOf(m.membershipId))} /> : <span className="text-xs text-muted-foreground">No members</span>) : <Skeleton className="h-6 w-20" />) : <Badge tone="warning">Deleted</Badge>}
                <Can permission="project:manage-teams"><Button variant="ghost" size="icon" aria-label={`Unassign ${name}`} disabled={unassign.isPending} onClick={() => unassign.mutate({ projectId, projectTeamId: r.id })}><X /></Button></Can>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
