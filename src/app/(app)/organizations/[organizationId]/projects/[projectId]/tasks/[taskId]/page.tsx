import type { Metadata } from "next";
import { Suspense } from "react";
import { TaskDetail } from "@/features/tasks/task-detail";

export const metadata: Metadata = { title: "Task" };

export default async function TaskPage({ params }: { params: Promise<{ projectId: string; taskId: string }> }) {
  const { projectId, taskId } = await params;
  return <Suspense><TaskDetail projectId={projectId} taskId={taskId} /></Suspense>;
}
