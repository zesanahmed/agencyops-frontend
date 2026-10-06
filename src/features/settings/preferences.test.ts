import { describe, expect, it } from "vitest";
import { mergePreferences } from "./preferences";

const row = (notificationType: string, inAppEnabled: boolean, emailEnabled: boolean) => ({ id: "x", notificationType, inAppEnabled, emailEnabled });

describe("mergePreferences", () => {
  it("shows MENTION as enabled/enabled when the backend returned no rows (lazy upsert)", () => {
    expect(mergePreferences([])).toEqual([{ notificationType: "MENTION", inAppEnabled: true, emailEnabled: true, stored: false }]);
  });
  it("a stored row overrides the default", () => {
    expect(mergePreferences([row("MENTION", true, false)])).toEqual([{ notificationType: "MENTION", inAppEnabled: true, emailEnabled: false, stored: true }]);
  });
  it("lists extra types the API returns after the known ones, without duplicates", () => {
    const r = mergePreferences([row("TASK_ASSIGNED", false, true), row("MENTION", false, false)]);
    expect(r.map((p) => p.notificationType)).toEqual(["MENTION", "TASK_ASSIGNED"]);
    expect(r[1]).toMatchObject({ inAppEnabled: false, emailEnabled: true, stored: true });
  });
});
