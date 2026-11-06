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
  it("builds the team trail with the team's name", () => {
    expect(buildCrumbs("/organizations/o1/teams/t1", { org: "Acme", team: "Backend" })).toEqual([
      { label: "Acme", href: "/organizations/o1" },
      { label: "Teams", href: "/organizations/o1/teams" },
      { label: "Backend" },
    ]);
  });
  it("labels the teams list itself as the current page", () => {
    expect(buildCrumbs("/organizations/o1/teams", { org: "Acme" })).toEqual([{ label: "Acme", href: "/organizations/o1" }, { label: "Teams" }]);
  });
  it("falls back to a generic team label while the name loads", () => {
    expect(buildCrumbs("/organizations/o1/teams/t1", {})[2].label).toBe("Team");
  });
  it("falls back to generic labels while names load", () => {
    expect(buildCrumbs("/organizations/o1/projects/p1", {})[2].label).toBe("Project");
  });
  it("labels the activity feed", () => {
    expect(buildCrumbs("/organizations/o1/activity", { org: "Acme" })).toEqual([{ label: "Acme", href: "/organizations/o1" }, { label: "Activity" }]);
  });
  it("covers clients and invoices", () => {
    expect(buildCrumbs("/organizations/o1/clients/c1", { org: "Acme" })).toEqual([{ label: "Acme", href: "/organizations/o1" }, { label: "Clients", href: "/organizations/o1/clients" }, { label: "Client" }]);
    expect(buildCrumbs("/organizations/o1/invoices/new", { org: "Acme" }).map((c) => c.label)).toEqual(["Acme", "Invoices", "New invoice"]);
    expect(buildCrumbs("/organizations/o1/invoices/i1/edit", { org: "Acme" })).toEqual([{ label: "Acme", href: "/organizations/o1" }, { label: "Invoices", href: "/organizations/o1/invoices" }, { label: "Invoice", href: "/organizations/o1/invoices/i1" }, { label: "Edit" }]);
  });
  it("labels the client requests inbox", () => {
    expect(buildCrumbs("/organizations/o1/requests", { org: "Acme" }).map((c) => c.label)).toEqual(["Acme", "Client requests"]);
  });
});
