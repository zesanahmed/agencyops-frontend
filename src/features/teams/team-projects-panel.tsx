"use client";

import Link from "next/link";
import { FolderKanban, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { Can, useOrg } from "@/features/organizations/org-context";
import type { Team } from "@/types/domain";
import { MAX_ASSIGNMENT_PROJECTS, useAssignTeam, useTeamAssignments, useUnassignTeam } from "./hooks";

export function TeamProjectsPanel({ team }: { team: Team }) {
  const { organizationId: o } = useOrg();
  const assignments = useTeamAssignments(o);
  const assign = useAssignTeam(o);
  const unassign = useUnassignTeam(o);

  if (assignments.isLoading) return <div className="space-y-2">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (assignments.isError) return <ErrorState title="Couldn't load this team's projects" />;

  const assigned = assignments.byTeam.get(team.id) ?? [];
  const assignedIds = new Set(assigned.map((a) => a.project.id));
  const candidates = assignments.projects.filter((p) => !assignedIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Assigning a team shows who is responsible for a project. It doesn&apos;t add the team&apos;s people to the project; do that from the project&apos;s People tab.
      </p>

      <Can permission="project:manage-teams">
        <Select aria-label="Assign to a project" value="" disabled={assign.isPending || !candidates.length} onChange={(e) => e.target.value && assign.mutate({ projectId: e.target.value, teamId: team.id })} className="sm:max-w-xs">
          <option value="">{candidates.length ? "Assign to a project…" : "Assigned to every project"}</option>
          {candidates.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Can>

      {!assigned.length ? (
        <EmptyState icon={FolderKanban} title="Not assigned to any project" description="Assign this team to the projects it is responsible for." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {assigned.map(({ project, projectTeamId }) => (
            <li key={projectTeamId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Link href={`/organizations/${o}/projects/${project.id}`} className="min-w-0 flex-1 basis-44 truncate text-sm font-medium hover:underline">{project.name}</Link>
              <ProjectStatusBadge status={project.status} />
              <Can permission="project:manage-teams"><Button variant="ghost" size="icon" aria-label={`Unassign from ${project.name}`} disabled={unassign.isPending} onClick={() => unassign.mutate({ projectId: project.id, projectTeamId })}><X /></Button></Can>
            </li>
          ))}
        </ul>
      )}
      {assignments.truncated ? <p className="text-xs text-muted-foreground">Looking at your {MAX_ASSIGNMENT_PROJECTS} most recent projects only.</p> : null}
    </div>
  );
}
