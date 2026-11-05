"use client";

import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortalProjects } from "./hooks";
import { PortalProjectCard } from "./portal-project-card";

/** Projects the agency has shared with this contact (the server only returns granted ones). */
export function PortalProjectsView({ limit }: { limit?: number }) {
  const q = usePortalProjects();
  if (q.isLoading) return <div className="grid gap-3 sm:grid-cols-2" role="status" aria-label="Loading projects">{[0, 1].map((i) => <Skeleton key={i} className="h-36" />)}</div>;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load your projects" />;
  if (!q.data?.length) return <EmptyState icon={FolderKanban} title="No projects shared with you yet" description="When your agency gives you access to a project, it shows up here with its progress. Ask them if you expected to see one." />;
  const items = limit ? q.data.slice(0, limit) : q.data;
  return <ul className="grid gap-3 sm:grid-cols-2">{items.map((p) => <li key={p.id}><PortalProjectCard project={p} /></li>)}</ul>;
}
