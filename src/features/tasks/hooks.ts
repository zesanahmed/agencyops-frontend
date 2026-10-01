"use client";

import { useQuery } from "@tanstack/react-query";
import { commentApi, memberApi, taskApi, type TaskInput } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";
import { qk } from "@/features/organizations/hooks";

const tasksKey = (o: string, p: string) => ["organizations", o, "projects", p, "tasks"];

export const useAllMembers = (o: string) =>
  useQuery({ queryKey: qk.members(o, { limit: 100 }), queryFn: () => memberApi.list(o, { limit: 100 }), staleTime: 60_000 });

export const useSubtasks = (o: string, p: string, t: string) =>
  useQuery({ queryKey: [...tasksKey(o, p), t, "subtasks"], queryFn: () => taskApi.subtasks(o, p, t) });

export const useCollaborators = (o: string, p: string, t: string) =>
  useQuery({ queryKey: [...tasksKey(o, p), t, "collaborators"], queryFn: () => taskApi.collaborators(o, p, t) });

export const useComments = (o: string, p: string, t: string, page = 1) =>
  useQuery({ queryKey: [...tasksKey(o, p), t, "comments", page], queryFn: () => commentApi.list(o, p, t, { page, limit: 20 }), placeholderData: (prev) => prev });

export const useCreateTask = (o: string, p: string) =>
  useAction({ fn: (b: TaskInput) => taskApi.create(o, p, b), invalidate: [tasksKey(o, p)], success: "Task created" });

export const useUpdateTask = (o: string, p: string, t: string) =>
  useAction({ fn: (b: Partial<TaskInput> & { status?: string }) => taskApi.update(o, p, t, b), invalidate: [tasksKey(o, p)] });

export const useDeleteTask = (o: string, p: string) =>
  useAction({ fn: (t: string) => taskApi.remove(o, p, t), invalidate: [tasksKey(o, p)], success: "Task deleted" });

export const useCreateSubtask = (o: string, p: string, t: string) =>
  useAction({ fn: (title: string) => taskApi.createSubtask(o, p, t, title), invalidate: [[...tasksKey(o, p), t, "subtasks"]], success: "Subtask added" });

export const useAddCollaborator = (o: string, p: string, t: string) =>
  useAction({ fn: (m: string) => taskApi.addCollaborator(o, p, t, m), invalidate: [[...tasksKey(o, p), t, "collaborators"]], success: "Collaborator added" });

export const useRemoveCollaborator = (o: string, p: string, t: string) =>
  useAction({ fn: (id: string) => taskApi.removeCollaborator(o, p, t, id), invalidate: [[...tasksKey(o, p), t, "collaborators"]], success: "Collaborator removed" });

export const useCreateComment = (o: string, p: string, t: string) =>
  useAction({ fn: (b: { content: string; mentionedMembershipIds?: string[] }) => commentApi.create(o, p, t, b), invalidate: [[...tasksKey(o, p), t, "comments"]] });

export const useUpdateComment = (o: string, p: string, t: string) =>
  useAction({ fn: (v: { id: string; content: string }) => commentApi.update(o, p, t, v.id, v.content), invalidate: [[...tasksKey(o, p), t, "comments"]], success: "Comment updated" });

export const useDeleteComment = (o: string, p: string, t: string) =>
  useAction({ fn: (id: string) => commentApi.remove(o, p, t, id), invalidate: [[...tasksKey(o, p), t, "comments"]], success: "Comment deleted" });
