import { describe, expect, it } from "vitest";
import { dayBucket, groupByDay, notificationKind } from "./notification-meta";
import type { AppNotification } from "@/types/domain";

// Local-time "now": 10 Jun 2026, 15:00. Buckets are local calendar days.
const NOW = new Date(2026, 5, 10, 15, 0).getTime();
const at = (d: number, h = 12) => new Date(2026, 5, d, h, 0).toISOString();
const n = (id: string, createdAt: string): AppNotification => ({ id, type: "MENTION", title: "t", message: "", readAt: null, createdAt });

describe("notificationKind", () => {
  it("knows MENTION and falls back gracefully for types the backend adds later", () => {
    expect(notificationKind("MENTION").label).toBe("Mention");
    expect(notificationKind("CLIENT_MESSAGE").label).toBe("Client message");
    expect(notificationKind("SOMETHING_NEW")).toMatchObject({ label: "Something new" });
    expect(notificationKind("").label).toBe("Notification");
    expect(notificationKind("X").icon).toBeTruthy();
  });
});

describe("dayBucket", () => {
  it("uses local calendar days", () => {
    expect(dayBucket(at(10, 0), NOW)).toBe("Today");
    expect(dayBucket(at(10, 14), NOW)).toBe("Today");
    expect(dayBucket(at(9, 23), NOW)).toBe("Yesterday");
    expect(dayBucket(at(9, 0), NOW)).toBe("Yesterday");
    expect(dayBucket(at(8, 23), NOW)).toBe("Earlier");
    expect(dayBucket("nonsense", NOW)).toBe("Earlier");
  });
});

describe("groupByDay", () => {
  it("keeps newest-first order, groups consecutive buckets and drops empty ones", () => {
    const groups = groupByDay([n("a", at(10, 14)), n("b", at(10, 9)), n("c", at(5)), n("d", at(1))], NOW);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([["Today", ["a", "b"]], ["Earlier", ["c", "d"]]]);
    expect(groupByDay([], NOW)).toEqual([]);
  });
});
