"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useOrgWork } from "@/features/dashboard/use-org-work";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { ApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { useDeleteTeam, useTeam, useTeamAssignments, useTeamMembers } from "./hooks";
import { TeamFormDialog } from "./team-form-dialog";
import { TeamMembersPanel } from "./team-members-panel";
import { TeamProjectsPanel } from "./team-projects-panel";
import { openTaskCounts } from "./workload";

export function TeamDetail({ teamId }: { teamId: string }) {
  const { organizationId: o } = useOrg();
  const router = useRouter();
  const { get, set } = useUrlState();
  const tab = get("tab") === "projects" ? "projects" : "members";
  const team = useTeam(o, teamId);
  const members = useTeamMembers(o, teamId, team.isSuccess); // don't ask for members of a team that doesn't exist
  const assignments = useTeamAssignments(o);
  const work = useOrgWork(o);
  const del = useDeleteTeam(o);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Open tasks per person, from open projects (the backend has no per-person workload endpoint).
  const openTasks = useMemo(() => openTaskCounts(work.tasks), [work.tasks]);
  const teamOpenTasks = (members.data ?? []).reduce((sum, m) => sum + (openTasks.get(m.membershipId) ?? 0), 0);
  const projectCount = assignments.byTeam.get(teamId)?.length ?? 0;
  const back = `/organizations/${o}/teams`;

  if (team.isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  if (team.isError || !team.data) {
    const e = team.error;
    // 404 = no such team in this org; 400 = malformed id (the backend validates it as a UUID first).
    if (e instanceof ApiError && (e.isNotFound || e.status === 400))
      return <EmptyState icon={UsersRound} title="Team not found" description="It may have been deleted, or the link is wrong." action={<Button asChild><Link href={back}>All teams</Link></Button>} />;
    return <ErrorState error={e} onRetry={() => team.refetch()} title="Couldn't load this team" />;
  }
  const t = team.data;

  return (
    <>
      <Link href={back} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Teams</Link>
      <PageHeader
        title={t.name}
        description={t.description || undefined}
        eyebrow={<span>Created {formatDate(t.createdAt)}</span>}
        actions={<>
          <Can permission="team:update"><Button variant="secondary" onClick={() => setEditing(true)}><Pencil /> Edit</Button></Can>
          <Can permission="team:delete"><Button variant="ghost" size="icon" aria-label="Delete team" onClick={() => setDeleting(true)}><Trash2 /></Button></Can>
        </>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Members" value={members.data?.length ?? "…"} />
        <StatCard label="Projects" value={assignments.isLoading ? "…" : projectCount} hint={assignments.truncated ? "Among your recent projects" : undefined} />
        <StatCard label="Open tasks" value={work.isLoading || members.isLoading ? "…" : teamOpenTasks} hint={work.projectsTruncated || work.tasksTruncated ? "Partial: large workspace" : "Assigned to members, in open projects"} />
      </div>

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "members" ? "" : v })}>
        <TabsList aria-label="Team sections">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
        <TabsContent value="members"><TeamMembersPanel team={t} openTasks={openTasks} workloadLoading={work.isLoading} /></TabsContent>
        <TabsContent value="projects"><TeamProjectsPanel team={t} /></TabsContent>
      </Tabs>

      <TeamFormDialog mode="edit" team={t} open={editing} onOpenChange={setEditing} />
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete this team?"
        description={projectCount ? `“${t.name}” is assigned to ${projectCount} ${projectCount === 1 ? "project" : "projects"}. Those assignments will remain listed there as a deleted team until you unassign them.` : `“${t.name}” will be removed. Its people stay in the organization.`}
        confirmLabel="Delete team" destructive
        onConfirm={async () => { await del.mutateAsync(teamId); router.replace(back); }} />
    </>
  );
}
