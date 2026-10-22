"use client";

import { sprintApi, type SprintInput } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";

const sprintsKey = (o: string, p: string) => ["organizations", o, "projects", p, "sprints"];

export const useCreateSprint = (o: string, p: string) =>
  useAction({ fn: (b: SprintInput) => sprintApi.create(o, p, b), invalidate: [sprintsKey(o, p)], success: (s) => `${s.name} planned` });

export const useUpdateSprint = (o: string, p: string, s: string) =>
  useAction({ fn: (b: Partial<SprintInput>) => sprintApi.update(o, p, s, b), invalidate: [sprintsKey(o, p)], success: "Sprint updated" });

export const useStartSprint = (o: string, p: string) =>
  useAction({ fn: (id: string) => sprintApi.start(o, p, id), invalidate: [sprintsKey(o, p)], success: "Sprint started" });

/** Completing can move tasks, so task lists and the project's aggregates are refreshed too. */
export const useCompleteSprint = (o: string, p: string) =>
  useAction({
    fn: ({ id, moveOpenTasksTo }: { id: string; moveOpenTasksTo?: string }) => sprintApi.complete(o, p, id, moveOpenTasksTo),
    invalidate: [["organizations", o, "projects", p]],
    success: (r) => (r.movedTaskCount ? `Sprint completed. ${r.movedTaskCount} ${r.movedTaskCount === 1 ? "task" : "tasks"} moved` : "Sprint completed"),
  });

export const useDeleteSprint = (o: string, p: string) =>
  useAction({ fn: (id: string) => sprintApi.remove(o, p, id), invalidate: [sprintsKey(o, p)], success: "Sprint deleted" });
