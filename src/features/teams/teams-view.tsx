"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, UsersRound } from "lucide-react";
import { AvatarStack } from "@/components/shared/avatar-stack";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import type { Team, TeamMember } from "@/types/domain";
import type { TeamAssignment } from "./workload";
import { MAX_ASSIGNMENT_PROJECTS, useTeamAssignments, useTeamDirectory, useTeamsMembers } from "./hooks";
import { TeamFormDialog } from "./team-form-dialog";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function TeamsView() {
  const { organizationId: o } = useOrg();
  const router = useRouter();
  const { get } = useUrlState();
  const search = get("search");
  const [creating, setCreating] = useState(false);

  // The backend's teams list takes only page/limit (no search), so all teams are loaded once and filtered here.
  const teams = useTeamDirectory(o);
  const needle = search.trim().toLowerCase();
  const visible = teams.list.filter((t) => !needle || t.name.toLowerCase().includes(needle) || (t.description ?? "").toLowerCase().includes(needle));
  const members = useTeamsMembers(o, visible.map((t) => t.id));
  const assignments = useTeamAssignments(o);
  const directory = useMemberDirectory(o);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search teams…" label="Search teams" />
        <div className="sm:ml-auto"><Can permission="team:create"><Button onClick={() => setCreating(true)}><Plus /> New team</Button></Can></div>
      </div>

      {teams.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}</div>
        : teams.isError ? <ErrorState error={teams.error} onRetry={() => teams.refetch()} title="Couldn't load teams" />
        : !visible.length ? (
          <EmptyState icon={UsersRound} title={search ? "No teams match" : "No teams yet"}
            description={search ? "Try a different search." : "A team groups the people who work together. Assign teams to projects to show who is responsible for what."}
            action={!search ? <Can permission="team:create"><Button onClick={() => setCreating(true)}><Plus /> Create a team</Button></Can> : undefined} />
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((t) => (
                <li key={t.id}>
                  <TeamCard team={t} orgId={o} members={members.byTeam.get(t.id)} assignments={assignments.isLoading ? undefined : assignments.byTeam.get(t.id) ?? []} nameOf={directory.nameOf} />
                </li>
              ))}
            </ul>
            {teams.total > teams.list.length ? <p className="text-xs text-muted-foreground">Showing the first {teams.list.length} of {teams.total} teams.</p> : null}
            {assignments.truncated ? <p className="text-xs text-muted-foreground">Project counts cover your {MAX_ASSIGNMENT_PROJECTS} most recent projects.</p> : null}
          </>
        )}

      <TeamFormDialog mode="create" open={creating} onOpenChange={setCreating} onSaved={(t) => router.push(`/organizations/${o}/teams/${t.id}`)} />
    </div>
  );
}

function TeamCard({ team, orgId, members, assignments, nameOf }: {
  team: Team; orgId: string; members: TeamMember[] | undefined; assignments: TeamAssignment[] | undefined; nameOf: (id: string) => string;
}) {
  return (
    <Link href={`/organizations/${orgId}/teams/${team.id}`} className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="space-y-1">
        <h3 className="font-medium leading-snug">{team.name}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{team.description || "No description."}</p>
      </div>
      <div className="mt-auto space-y-2">
        <div className="flex min-h-6 items-center justify-between gap-3">
          {members ? (members.length ? <AvatarStack names={members.map((m) => nameOf(m.membershipId))} /> : <span className="text-xs text-muted-foreground">No members yet</span>) : <Skeleton className="h-6 w-24" />}
          <span className="text-xs text-muted-foreground">
            {members ? plural(members.length, "member") : "…"} · {assignments ? plural(assignments.length, "project") : "…"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Created {formatDate(team.createdAt)}</p>
      </div>
    </Link>
  );
}
