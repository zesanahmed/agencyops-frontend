import { describe, expect, it } from "vitest";
import { ACCEPT_ATTR, MAX_FILE_BYTES, fileTypeLabel, formatBytes, isImageType, validateFile } from "./files";

const f = (type: string, size: number, name = "a.bin") => ({ type, size, name });

describe("validateFile (mirrors the backend allow-list and 10 MB limit)", () => {
  it("accepts allowed types at the limit", () => {
    expect(validateFile(f("application/pdf", MAX_FILE_BYTES))).toBeNull();
    expect(validateFile(f("image/png", 1))).toBeNull();
    expect(validateFile(f("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 500))).toBeNull();
  });
  it("rejects too large, empty and unsupported files with a specific message", () => {
    expect(validateFile(f("application/pdf", MAX_FILE_BYTES + 1, "big.pdf"))).toMatch(/big\.pdf.*10 MB/);
    expect(validateFile(f("application/pdf", 0))).toBe("That file is empty.");
    expect(validateFile(f("application/zip", 100, "x.zip"))).toMatch(/x\.zip.*supported/);
    expect(validateFile(f("", 100, "noext"))).toMatch(/supported/);
  });
  it("accept attribute lists exactly the allowed types", () => {
    expect(ACCEPT_ATTR.split(",")).toContain("image/webp");
    expect(ACCEPT_ATTR).not.toContain("zip");
  });
  it("formats sizes and labels", () => {
    expect([formatBytes(512), formatBytes(2048), formatBytes(200 * 1024), formatBytes(5 * 1024 * 1024)]).toEqual(["512 B", "2.0 KB", "200 KB", "5.0 MB"]);
    expect([fileTypeLabel("application/pdf"), fileTypeLabel("application/x-foo")]).toEqual(["PDF", "X-FOO"]);
    expect([isImageType("image/gif"), isImageType("application/pdf")]).toEqual([true, false]);
  });
});
