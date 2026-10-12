import { describe, expect, it } from "vitest";
import { buildSprintPayload } from "./sprint-payload";
import { sprintSchema } from "./schemas";

describe("sprintSchema", () => {
  it("requires a name and both dates, and an end on or after the start", () => {
    expect(sprintSchema.safeParse({ name: "", startDate: "2026-01-01", endDate: "2026-01-14" }).success).toBe(false);
    expect(sprintSchema.safeParse({ name: "S1", startDate: "", endDate: "2026-01-14" }).success).toBe(false);
    expect(sprintSchema.safeParse({ name: "S1", startDate: "2026-01-01", endDate: "" }).success).toBe(false);
    const bad = sprintSchema.safeParse({ name: "S1", startDate: "2026-01-14", endDate: "2026-01-01" });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.issues[0]).toMatchObject({ path: ["endDate"], message: "End date must be on or after the start date" });
    expect(sprintSchema.safeParse({ name: "S1", startDate: "2026-01-01", endDate: "2026-01-01" }).success).toBe(true);
  });
  it("bounds name (150) and goal (2000) like the backend", () => {
    expect(sprintSchema.safeParse({ name: "x".repeat(151), startDate: "2026-01-01", endDate: "2026-01-02" }).success).toBe(false);
    expect(sprintSchema.safeParse({ name: "S", goal: "x".repeat(2001), startDate: "2026-01-01", endDate: "2026-01-02" }).success).toBe(false);
  });
});

describe("buildSprintPayload", () => {
  it("sends dates as UTC midnight, independent of the machine's time zone (the old local-midnight bug)", () => {
    expect(buildSprintPayload({ name: " S1 ", goal: "", startDate: "2026-01-01", endDate: "2026-01-14" }, false)).toEqual({
      name: "S1", startDate: "2026-01-01T00:00:00.000Z", endDate: "2026-01-14T00:00:00.000Z",
    });
  });
  it("create omits an empty goal; edit sends it as \"\" so it can be cleared", () => {
    expect(buildSprintPayload({ name: "S", goal: "Ship", startDate: "2026-01-01", endDate: "2026-01-02" }, false)).toHaveProperty("goal", "Ship");
    expect(buildSprintPayload({ name: "S", goal: "", startDate: "2026-01-01", endDate: "2026-01-02" }, true)).toHaveProperty("goal", "");
    expect(buildSprintPayload({ name: "S", startDate: "2026-01-01", endDate: "2026-01-02" }, false)).not.toHaveProperty("goal");
  });
});
