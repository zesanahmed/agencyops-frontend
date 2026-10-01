import { describe, expect, it } from "vitest";
import { buildCrumbs } from "./breadcrumbs";

describe("buildCrumbs", () => {
  it("returns nothing outside an organization", () => {
    expect(buildCrumbs("/organizations")).toEqual([]);
    expect(buildCrumbs("/profile")).toEqual([]);
  });
  it("marks the current page as non-link", () => {
    expect(buildCrumbs("/organizations/o1/projects", { org: "Acme" })).toEqual([
      { label: "Acme", href: "/organizations/o1" },
      { label: "Projects" },
    ]);
  });
  it("builds project and task trails with real names", () => {
    expect(buildCrumbs("/organizations/o1/projects/p1/tasks/t1", { org: "Acme", project: "Site" })).toEqual([
      { label: "Acme", href: "/organizations/o1" },
      { label: "Projects", href: "/organizations/o1/projects" },
      { label: "Site", href: "/organizations/o1/projects/p1" },
      { label: "Task" },
    ]);
  });
  it("falls back to generic labels while names load", () => {
    expect(buildCrumbs("/organizations/o1/projects/p1", {})[2].label).toBe("Project");
  });
});
