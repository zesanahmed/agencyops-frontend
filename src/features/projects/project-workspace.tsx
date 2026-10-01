"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { PROJECT_STATUSES, ProjectStatusBadge, statusLabel } from "@/components/shared/status-badge";
import { Can, useOrg } from "@/features/organizations/org-context";
import { SprintPanel } from "@/features/sprints/sprint-panel";
import { TaskList } from "@/features/tasks/task-list";
import { formatDate } from "@/lib/format";
import { useDeleteProject, useProject, useUpdateProject } from "./hooks";
import { ProjectPeople } from "./project-people";

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const { organizationId, can } = useOrg();
  const router = useRouter();
  const { data: project, isLoading, isError, error, refetch } = useProject(organizationId, projectId);
  const update = useUpdateProject(organizationId, projectId);
  const del = useDeleteProject(organizationId);
  const [confirming, setConfirming] = useState(false);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-10 w-full" /><Skeleton className="h-64" /></div>;
  if (isError || !project) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load this project" />;

  const editable = can("project.manage");
  return (
    <>
      <Link href={`/organizations/${organizationId}/projects`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Projects</Link>
      <PageHeader
        title={project.name}
        description={project.description || undefined}
        eyebrow={<span className="flex items-center gap-2"><ProjectStatusBadge status={project.status} /> Created {formatDate(project.createdAt)}</span>}
        actions={editable ? (<>
          <Select aria-label="Project status" value={project.status} disabled={update.isPending} onChange={(e) => update.mutate({ status: e.target.value })} className="w-auto">
            {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{statusLabel.project(s)}</option>)}
          </Select>
          <Can permission="project.manage"><Button variant="ghost" size="icon" aria-label="Delete project" onClick={() => setConfirming(true)}><Trash2 /></Button></Can>
        </>) : undefined}
      />
      <Tabs defaultValue="tasks">
        <TabsList aria-label="Project sections">
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks"><TaskList projectId={projectId} /></TabsContent>
        <TabsContent value="sprints"><SprintPanel projectId={projectId} /></TabsContent>
        <TabsContent value="people"><ProjectPeople projectId={projectId} /></TabsContent>
      </Tabs>
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Delete this project?" description="Its sprints and tasks will no longer be accessible. This can't be undone from the UI." confirmLabel="Delete project" destructive
        onConfirm={async () => { await del.mutateAsync(projectId); router.replace(`/organizations/${organizationId}/projects`); }} />
    </>
  );
}
