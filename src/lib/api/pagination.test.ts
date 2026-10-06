import { describe, expect, it } from "vitest";
import { normalizePage } from "./pagination";

const fb = { page: 1, limit: 20 };

describe("normalizePage (backend list envelope)", () => {
  it("reads data.<key> and data.pagination", () => {
    const body = { success: true, message: "ok", data: { organizations: [{ id: "a" }, { id: "b" }], pagination: { page: 2, limit: 2, total: 5, totalPages: 3 } } };
    const r = normalizePage<{ id: string }>(body, "organizations", fb);
    expect(r.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(r.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it("only reads the requested key (a differently named list is not guessed at)", () => {
    const body = { data: { members: [{ id: "m" }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } };
    expect(normalizePage(body, "organizations", fb).items).toEqual([]);
    expect(normalizePage(body, "members", fb).items).toHaveLength(1);
  });

  it("derives totals when pagination is missing", () => {
    const r = normalizePage<number>({ data: { tasks: [1, 2, 3] } }, "tasks", fb);
    expect(r.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1 });
  });

  it("never throws on junk", () => {
    expect(normalizePage(null, "x", fb).items).toEqual([]);
    expect(normalizePage("nope", "x", fb).meta.page).toBe(1);
    expect(normalizePage({ data: { x: "not-an-array" } }, "x", fb).items).toEqual([]);
  });
});
