import { describe, expect, it } from "vitest";
import { dayBucket, groupByDay, notificationHref, notificationKind } from "./notification-meta";
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

describe("notificationHref (FRONTEND_CONTRACT §3.7)", () => {
  it("leads to the task, the project's sprints, or the project", () => {
    expect(notificationHref("o1", { type: "MENTION", data: { projectId: "p1", taskId: "t1", commentId: "c1" } })).toBe("/organizations/o1/projects/p1/tasks/t1");
    expect(notificationHref("o1", { type: "TASK_STATUS_CHANGED", data: { projectId: "p1", taskId: "t1", from: "TODO", to: "DONE" } })).toBe("/organizations/o1/projects/p1/tasks/t1");
    expect(notificationHref("o1", { type: "SPRINT_STARTED", data: { projectId: "p1", sprintId: "s1" } })).toBe("/organizations/o1/projects/p1?tab=sprints");
    expect(notificationHref("o1", { type: "CLIENT_MESSAGE", data: { projectId: "p1", messageId: "m1" } })).toBe("/organizations/o1/projects/p1");
  });
  it("has no link for old notifications without data, or for invoice targets (no internal page yet)", () => {
    expect(notificationHref("o1", { type: "MENTION", data: null })).toBeNull();
    expect(notificationHref("o1", { type: "MENTION" })).toBeNull();
    expect(notificationHref("o1", { type: "INVOICE_PAID", data: { invoiceId: "i1" } })).toBeNull();
  });
  it("knows every type the backend sends", () => {
    for (const t of ["MENTION", "TASK_ASSIGNED", "TASK_STATUS_CHANGED", "SPRINT_STARTED", "CLIENT_MESSAGE", "CLIENT_REQUEST", "CLIENT_FILE", "INVOICE_PAID", "INVOICE_PAYMENT_ATTENTION"]) {
      expect(notificationKind(t).label).not.toBe(notificationKind("ZZZ").label);
    }
  });
});
