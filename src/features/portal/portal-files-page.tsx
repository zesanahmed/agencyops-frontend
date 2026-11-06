"use client";

import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PageHeader } from "@/components/shared/page-header";
import { Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUrlState } from "@/hooks/use-url-state";
import { usePortalProjects } from "./hooks";
import { PortalFiles } from "./portal-files";

/** Files live per project, so this page is a project picker over the same list. The choice is in the URL (?project=). */
export function PortalFilesPage() {
  const { get, set } = useUrlState();
  const q = usePortalProjects();
  const projects = q.data ?? [];
  const chosen = projects.find((p) => p.id === get("project")) ?? projects[0];

  return (
    <>
      <PageHeader title="Files" description="Documents you and your agency share, project by project." />
      {q.isLoading ? <Skeleton className="h-40" />
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load your projects" />
        : !chosen ? <EmptyState icon={FolderKanban} title="No projects shared with you yet" description="Files are shared within a project. Once your agency gives you access to one, it appears here." />
        : (
          <div className="space-y-5">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="files-project">Project</Label>
              <Select id="files-project" value={chosen.id} onChange={(e) => set({ project: e.target.value, page: "" })}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
            </div>
            <PortalFiles key={chosen.id} projectId={chosen.id} />
          </div>
        )}
    </>
  );
}
