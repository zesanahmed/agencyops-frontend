import { describe, expect, it } from "vitest";
import { normalizePage } from "./pagination";

const fb = { page: 1, limit: 20 };

describe("normalizePage", () => {
  it("handles { data: [], meta }", () => {
    const r = normalizePage<number>({ data: [1, 2], meta: { page: 2, limit: 2, total: 5, totalPages: 3 } }, fb);
    expect(r.items).toEqual([1, 2]);
    expect(r.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });
  it("handles { data: { items, pagination } }", () => {
    const r = normalizePage<number>({ data: { items: [1], pagination: { total: 1 } } }, fb);
    expect(r.items).toEqual([1]);
    expect(r.meta.totalPages).toBe(1);
  });
  it("handles a bare array and derives totals", () => {
    const r = normalizePage<number>([1, 2, 3], fb);
    expect(r.meta.total).toBe(3);
  });
  it("never throws on junk", () => {
    expect(normalizePage(null, fb).items).toEqual([]);
    expect(normalizePage("x", fb).meta.page).toBe(1);
  });
});
