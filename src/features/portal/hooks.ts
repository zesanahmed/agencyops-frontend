"use client";

import { useQuery } from "@tanstack/react-query";
import { portalProjectsApi } from "@/lib/api/services";
import { usePortalAuthStore } from "@/stores/portal-auth-store";

const usePortalAuthed = () => usePortalAuthStore((s) => s.status === "authenticated");

/** Every portal query key starts with "portal" so signing out can drop exactly the portal's cache. */
export const pqk = {
  projects: ["portal", "projects"] as const,
  project: (id: string) => ["portal", "projects", id] as const,
  tasks: (id: string, p: object) => ["portal", "projects", id, "tasks", p] as const,
  updates: (id: string, p: object) => ["portal", "projects", id, "updates", p] as const,
};

export function usePortalProjects() {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.projects, queryFn: () => portalProjectsApi.list(), enabled: authed });
}
export function usePortalProject(id: string) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.project(id), queryFn: () => portalProjectsApi.get(id), enabled: authed });
}
export function usePortalTasks(id: string, params: { page?: number; limit?: number; status?: string }) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.tasks(id, params), queryFn: () => portalProjectsApi.tasks(id, params), enabled: authed, placeholderData: (p) => p });
}
export function usePortalUpdates(id: string, params: { page?: number; limit?: number }) {
  const authed = usePortalAuthed();
  return useQuery({ queryKey: pqk.updates(id, params), queryFn: () => portalProjectsApi.updates(id, params), enabled: authed, placeholderData: (p) => p });
}
