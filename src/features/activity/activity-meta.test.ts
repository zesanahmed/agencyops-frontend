import { describe, expect, it } from "vitest";
import { actionLabel, activityHref, activityIcon, ENTITY_FILTERS } from "./activity-meta";

describe("activityHref", () => {
  it("leads to the task, else the project", () => {
    expect(activityHref("o1", { action: "task.created", entityType: "Task", projectId: "p1", taskId: "t1" })).toBe("/organizations/o1/projects/p1/tasks/t1");
    expect(activityHref("o1", { action: "sprint.started", entityType: "Sprint", projectId: "p1", taskId: null })).toBe("/organizations/o1/projects/p1");
  });
  it("never links to something that was deleted", () => {
    for (const action of ["task.deleted", "project.deleted", "sprint.deleted"]) expect(activityHref("o1", { action, entityType: "Task", projectId: "p1", taskId: "t1" })).toBeNull();
  });
  it("sends member events to the members list, except removals", () => {
    expect(activityHref("o1", { action: "member.joined", entityType: "Membership", projectId: null, taskId: null })).toBe("/organizations/o1/members");
    expect(activityHref("o1", { action: "member.removed", entityType: "Membership", projectId: null, taskId: null })).toBeNull();
  });
});

describe("activity labels", () => {
  it("humanizes actions and falls back to an icon for unknown ones", () => {
    expect(actionLabel("task.status_changed")).toBe("Task status changed");
    expect(activityIcon("brand.new")).toBeTruthy();
  });
  it("offers exactly the entity types the backend validates", () => {
    expect(ENTITY_FILTERS.map((f) => f.value)).toEqual(["Project", "Sprint", "Task", "Comment", "Membership"]);
  });
});
