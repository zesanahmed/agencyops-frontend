import { describe, expect, it } from "vitest";
import { buildTeamAssignments, openTaskCounts } from "./workload";
import type { Project, ProjectTeam } from "@/types/domain";

const proj = (id: string): Project => ({ id, name: `P-${id}`, slug: id, description: null, status: "ACTIVE", startDate: null, dueDate: null, createdAt: "", updatedAt: "" });
const pt = (id: string, projectId: string, teamId: string): ProjectTeam => ({ id, projectId, teamId });

describe("openTaskCounts", () => {
  it("counts non-DONE tasks per assignee and ignores unassigned and finished work", () => {
    const m = openTaskCounts([
      { assigneeMembershipId: "a", status: "TODO" }, { assigneeMembershipId: "a", status: "IN_REVIEW" }, { assigneeMembershipId: "a", status: "DONE" },
      { assigneeMembershipId: "b", status: "BACKLOG" }, { assigneeMembershipId: null, status: "TODO" },
    ]);
    expect(m.get("a")).toBe(2);
    expect(m.get("b")).toBe(1);
    expect(m.has("c")).toBe(false);
    expect(m.size).toBe(2);
  });
  it("is empty for no tasks", () => {
    expect(openTaskCounts([]).size).toBe(0);
  });
});

describe("buildTeamAssignments", () => {
  it("inverts project→teams into team→projects, preserving project order", () => {
    const projects = [proj("p1"), proj("p2"), proj("p3")];
    const m = buildTeamAssignments(projects, { p1: [pt("1", "p1", "t1"), pt("2", "p1", "t2")], p2: [pt("3", "p2", "t1")], p3: [] });
    expect(m.get("t1")!.map((a) => a.project.id)).toEqual(["p1", "p2"]);
    expect(m.get("t2")!.map((a) => a.project.id)).toEqual(["p1"]);
    expect(m.get("t1")!.map((a) => a.projectTeamId)).toEqual(["1", "3"]); // needed to unassign
    expect(m.has("t3")).toBe(false);
  });
  it("tolerates projects whose assignments haven't loaded", () => {
    expect(buildTeamAssignments([proj("p1")], {}).size).toBe(0);
  });
  it("keeps assignments of teams that no longer exist (the backend still lists them)", () => {
    const m = buildTeamAssignments([proj("p1")], { p1: [pt("1", "p1", "deleted-team")] });
    expect(m.get("deleted-team")).toHaveLength(1);
  });
});
