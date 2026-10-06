import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("allows same-origin paths, including query strings", () => {
    expect(safeNext("/organizations/o1/projects?status=ACTIVE")).toBe("/organizations/o1/projects?status=ACTIVE");
    expect(safeNext("/invite/abc123")).toBe("/invite/abc123");
  });
  it("falls back for missing or empty values", () => {
    expect(safeNext(null)).toBe("/organizations");
    expect(safeNext(undefined)).toBe("/organizations");
    expect(safeNext("")).toBe("/organizations");
  });
  it("blocks open-redirect attempts", () => {
    for (const bad of ["//evil.example", "///evil.example", "/\\evil.example", "https://evil.example", "http://evil.example/x", "javascript:alert(1)", "evil.example", "/ok\nSet-Cookie: x=1", "/ok\u0000"])
      expect(safeNext(bad)).toBe("/organizations");
  });
  it("supports a custom fallback", () => {
    expect(safeNext("//x", "/login")).toBe("/login");
  });
});
