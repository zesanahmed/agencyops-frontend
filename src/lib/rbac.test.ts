import { describe, expect, it } from "vitest";
import { can } from "./rbac";

describe("can()", () => {
  it("restricts organization deletion to OWNER", () => {
    expect(can("OWNER", "organization.delete")).toBe(true);
    expect(can("MANAGER", "organization.delete")).toBe(false);
    expect(can("TEAM_MEMBER", "organization.delete")).toBe(false);
  });
  it("lets OWNER and MANAGER invite, not TEAM_MEMBER", () => {
    expect(can("MANAGER", "member.invite")).toBe(true);
    expect(can("TEAM_MEMBER", "member.invite")).toBe(false);
  });
  it("denies everything when the role is unknown", () => {
    expect(can(undefined, "task.create")).toBe(false);
  });
});
