import type { Metadata } from "next";
import { Suspense } from "react";
import { ProjectWorkspace } from "@/features/projects/project-workspace";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <Suspense><ProjectWorkspace projectId={projectId} /></Suspense>;
}
