"use client";

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { projectApi, teamApi } from "@/lib/api/services";
import { qk } from "@/lib/query-keys";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";
import type { Project, TeamMember } from "@/types/domain";
import type { TeamValues } from "./schemas";
import { buildTeamAssignments } from "./workload";

const orgTeams = (o: string) => ["organizations", o, "teams"] as const;
const useAuthed = () => useAuthStore((s) => s.status === "authenticated");

/** Every team in the organization (one request; the backend maximum page is 100). */
export function useTeamDirectory(o: string) {
  const authed = useAuthed();
  const q = useQuery({ queryKey: qk.teams(o, { all: true }), queryFn: () => teamApi.list(o, { limit: 100 }), enabled: authed, staleTime: 30_000 });
  return useMemo(() => {
    const list = q.data?.items ?? [];
    const byId = new Map(list.map((t) => [t.id, t]));
    return {
      list,
      byId,
      total: q.data?.meta.total ?? 0,
      /** The backend still lists assignments of soft-deleted teams, which are absent here. */
      nameOf: (id: string): string => byId.get(id)?.name ?? "Deleted team",
      exists: (id: string): boolean => byId.has(id),
      isLoading: q.isLoading,
      isError: q.isError,
      error: q.error,
      refetch: q.refetch,
    };
  }, [q.data, q.isLoading, q.isError, q.error, q.refetch]);
}

export function useTeam(o: string, teamId: string, enabled = true) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.team(o, teamId), queryFn: () => teamApi.get(o, teamId), enabled: authed && enabled });
}

export function useTeamMembers(o: string, teamId: string, enabled = true) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.teamMembers(o, teamId), queryFn: () => teamApi.members(o, teamId), enabled: authed && enabled });
}

/** Members of several teams at once (cards on the list page); shares cache keys with the detail page. */
export function useTeamsMembers(o: string, teamIds: string[]) {
  const authed = useAuthed();
  const qs = useQueries({ queries: teamIds.map((id) => ({ queryKey: qk.teamMembers(o, id), queryFn: () => teamApi.members(o, id), enabled: authed })) });
  const stamp = qs.map((q) => q.dataUpdatedAt).join(",");
  const ids = teamIds.join(",");
  const byTeam = useMemo(
    () => new Map<string, TeamMember[] | undefined>(teamIds.map((id, i) => [id, qs[i]?.data])),
    // `stamp` changes whenever any query's data changes; `qs` itself is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stamp, ids],
  );
  return { byTeam, isLoading: qs.some((q) => q.isLoading) };
}

export function useProjectTeams(o: string, projectId: string) {
  const authed = useAuthed();
  return useQuery({ queryKey: qk.projectTeams(o, projectId), queryFn: () => projectApi.teams(o, projectId), enabled: authed });
}

/** Bound on the fan-out below: one request per project. */
export const MAX_ASSIGNMENT_PROJECTS = 50;

/**
 * Which projects each team is assigned to. There is no endpoint for it, so this reads
 * `GET /projects/:id/teams` for the most recent projects and inverts the result.
 */
export function useTeamAssignments(o: string) {
  const authed = useAuthed();
  const projectsQ = useQuery({
    queryKey: qk.projects(o, { limit: 100, scope: "assignments" }),
    queryFn: () => projectApi.list(o, { limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
    enabled: authed,
  });
  const all = useMemo(() => projectsQ.data?.items ?? [], [projectsQ.data]);
  const scanned = useMemo(() => all.slice(0, MAX_ASSIGNMENT_PROJECTS), [all]);
  const qs = useQueries({ queries: scanned.map((p) => ({ queryKey: qk.projectTeams(o, p.id), queryFn: () => projectApi.teams(o, p.id), enabled: authed })) });
  const stamp = qs.map((q) => q.dataUpdatedAt).join(",");
  const byTeam = useMemo(
    () => buildTeamAssignments(scanned, Object.fromEntries(scanned.map((p, i) => [p.id, qs[i]?.data ?? []]))),
    // See useTeamsMembers: `stamp` tracks data changes across the query array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stamp, scanned],
  );
  return {
    byTeam,
    projects: all as Project[],
    isLoading: projectsQ.isLoading || qs.some((q) => q.isLoading),
    isError: projectsQ.isError || qs.some((q) => q.isError),
    truncated: (projectsQ.data?.meta.total ?? 0) > MAX_ASSIGNMENT_PROJECTS,
  };
}

// ---- mutations ----
export const useCreateTeam = (o: string) =>
  useAction({ fn: (v: TeamValues) => teamApi.create(o, { name: v.name, description: v.description || undefined }), invalidate: [orgTeams(o)], success: (t) => `${t.name} created` });

/** Description is sent as a string; "" clears it (the backend schema doesn't accept null). */
export const useUpdateTeam = (o: string, teamId: string) =>
  useAction({ fn: (v: TeamValues) => teamApi.update(o, teamId, { name: v.name, description: v.description ?? "" }), invalidate: [orgTeams(o)], success: "Team updated" });

export const useDeleteTeam = (o: string) =>
  useAction({ fn: (teamId: string) => teamApi.remove(o, teamId), invalidate: [orgTeams(o)], deferRefetch: true, success: "Team deleted" });

export const useAddTeamMember = (o: string, teamId: string) =>
  useAction({ fn: (membershipId: string) => teamApi.addMember(o, teamId, membershipId), invalidate: [orgTeams(o)], success: "Member added" });

export const useRemoveTeamMember = (o: string, teamId: string) =>
  useAction({ fn: (teamMemberId: string) => teamApi.removeMember(o, teamId, teamMemberId), invalidate: [orgTeams(o)], success: "Member removed" });

export const useAssignTeam = (o: string) =>
  useAction({
    fn: (v: { projectId: string; teamId: string }) => projectApi.assignTeam(o, v.projectId, v.teamId),
    invalidate: (v) => [qk.projectTeams(o, v.projectId)],
    success: "Team assigned",
  });

export const useUnassignTeam = (o: string) =>
  useAction({
    fn: (v: { projectId: string; projectTeamId: string }) => projectApi.unassignTeam(o, v.projectId, v.projectTeamId),
    invalidate: (v) => [qk.projectTeams(o, v.projectId)],
    success: "Team unassigned",
  });
