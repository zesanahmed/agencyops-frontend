import { describe, expect, it } from "vitest";
import { buildProjectPayload } from "./project-payload";
import { projectSchema } from "./schemas";
import type { Project } from "@/types/domain";

const project = (o: Partial<Project> = {}): Project => ({
  id: "p1", name: "Site", slug: "site", description: "Old", status: "ACTIVE", startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-02-01T00:00:00.000Z", createdAt: "", updatedAt: "", ...o,
});

describe("projectSchema", () => {
  it("requires a name and bounds name/description like the backend", () => {
    expect(projectSchema.safeParse({ name: "  " }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "x".repeat(201) }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "ok", description: "x".repeat(5001) }).success).toBe(false);
    expect(projectSchema.safeParse({ name: "ok" }).success).toBe(true);
  });
  it("rejects a due date before the start date, on the due date field", () => {
    const r = projectSchema.safeParse({ name: "ok", startDate: "2026-03-02", dueDate: "2026-03-01" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]).toMatchObject({ path: ["dueDate"], message: "Due date must be on or after the start date" });
    expect(projectSchema.safeParse({ name: "ok", startDate: "2026-03-01", dueDate: "2026-03-01" }).success).toBe(true);
    expect(projectSchema.safeParse({ name: "ok", dueDate: "2026-03-01" }).success).toBe(true);
  });
});

describe("buildProjectPayload", () => {
  it("create: sends only what was filled in, with dates as UTC-midnight ISO strings", () => {
    expect(buildProjectPayload({ name: " Site ", description: "", startDate: "", dueDate: "" })).toEqual({ ok: true, payload: { name: "Site" } });
    expect(buildProjectPayload({ name: "Site", description: "Hi", startDate: "2026-01-05", dueDate: "2026-02-05" })).toEqual({
      ok: true, payload: { name: "Site", description: "Hi", startDate: "2026-01-05T00:00:00.000Z", dueDate: "2026-02-05T00:00:00.000Z" },
    });
  });
  it("edit: always sends the description (\"\" clears it) and both dates so the backend's order check runs", () => {
    expect(buildProjectPayload({ name: "Site", description: "", startDate: "2026-01-01", dueDate: "2026-02-10" }, project())).toEqual({
      ok: true, payload: { name: "Site", description: "", startDate: "2026-01-01T00:00:00.000Z", dueDate: "2026-02-10T00:00:00.000Z" },
    });
  });
  it("edit: lets a project without dates stay without dates", () => {
    expect(buildProjectPayload({ name: "Site", description: "x", startDate: "", dueDate: "" }, project({ startDate: null, dueDate: null }))).toEqual({ ok: true, payload: { name: "Site", description: "x" } });
  });
  it("edit: clears a date the user emptied by sending null (the backend's clearableDate), and keeps the other one", () => {
    expect(buildProjectPayload({ name: "Site", startDate: "", dueDate: "2026-02-01" }, project())).toEqual({ ok: true, payload: { name: "Site", description: "", startDate: null, dueDate: "2026-02-01T00:00:00.000Z" } });
    expect(buildProjectPayload({ name: "Site", startDate: "2026-01-01", dueDate: "" }, project())).toEqual({ ok: true, payload: { name: "Site", description: "", startDate: "2026-01-01T00:00:00.000Z", dueDate: null } });
  });
});
