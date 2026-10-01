"use client";

import { useQuery } from "@tanstack/react-query";
import { projectApi, sprintApi, taskApi, type ListParams } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";
import { qk } from "@/features/organizations/hooks";

export const useProjects = (o: string, p: ListParams) =>
  useQuery({ queryKey: qk.projects(o, p), queryFn: () => projectApi.list(o, p), placeholderData: (prev) => prev });

export const useProject = (o: string, p: string) =>
  useQuery({ queryKey: qk.project(o, p), queryFn: () => projectApi.get(o, p) });

export const useSprints = (o: string, p: string) =>
  useQuery({ queryKey: qk.sprints(o, p), queryFn: () => sprintApi.list(o, p, { limit: 100 }) });

export const useTasks = (o: string, p: string, q: ListParams) =>
  useQuery({ queryKey: qk.tasks(o, p, q), queryFn: () => taskApi.list(o, p, q), placeholderData: (prev) => prev });

export const useTask = (o: string, p: string, t: string) =>
  useQuery({ queryKey: qk.task(o, p, t), queryFn: () => taskApi.get(o, p, t) });

export const useCreateProject = (o: string) =>
  useAction({ fn: (b: { name: string; description?: string }) => projectApi.create(o, b), invalidate: [["organizations", o, "projects"]], success: (p) => `${p.name} created` });

export const useUpdateProject = (o: string, p: string) =>
  useAction({ fn: (b: { name?: string; description?: string; status?: string }) => projectApi.update(o, p, b), invalidate: [["organizations", o, "projects"]], success: "Project updated" });

export const useDeleteProject = (o: string) =>
  useAction({ fn: (p: string) => projectApi.remove(o, p), invalidate: [["organizations", o, "projects"]], success: "Project deleted" });
