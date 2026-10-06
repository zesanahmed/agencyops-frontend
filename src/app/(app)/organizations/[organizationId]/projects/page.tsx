import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Can } from "@/features/organizations/org-context";
import { CreateProjectDialog } from "@/features/projects/project-form-dialog";
import { ProjectList } from "@/features/projects/project-list";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" description="Every engagement your agency is running, with its sprints and tasks." actions={<Can permission="project:create"><CreateProjectDialog /></Can>} />
      <Suspense><ProjectList /></Suspense>
    </>
  );
}
