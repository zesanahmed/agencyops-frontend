import type { Project, ProjectTeam } from "@/types/domain";

/** Open = anything not DONE. Subtasks never appear: the backend task list excludes them. */
export function openTaskCounts(tasks: { assigneeMembershipId: string | null; status: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tasks) {
    if (!t.assigneeMembershipId || t.status === "DONE") continue;
    counts.set(t.assigneeMembershipId, (counts.get(t.assigneeMembershipId) ?? 0) + 1);
  }
  return counts;
}

/** A team's assignment to one project; `projectTeamId` is what unassigning needs. */
export interface TeamAssignment { project: Project; projectTeamId: string }

/**
 * The backend has no "projects of a team" endpoint, only "teams of a project", so a team's
 * projects are derived from each project's assignments. Order follows `projects`.
 */
export function buildTeamAssignments(projects: Project[], teamsByProject: Record<string, ProjectTeam[]>): Map<string, TeamAssignment[]> {
  const byTeam = new Map<string, TeamAssignment[]>();
  for (const p of projects) {
    for (const pt of teamsByProject[p.id] ?? []) {
      const list = byTeam.get(pt.teamId) ?? [];
      list.push({ project: p, projectTeamId: pt.id });
      byTeam.set(pt.teamId, list);
    }
  }
  return byTeam;
}
