import { describe, expect, it } from "vitest";
import { ApiError } from "./errors";
import { extractFieldErrors } from "./field-errors";

const FIELDS = ["name", "email", "password"] as const;
const err = (status: number, details: unknown) => new ApiError(status, "x", undefined, details);

describe("extractFieldErrors", () => {
  it("reads [{ path, message }] with array or string paths", () => {
    expect(extractFieldErrors(err(400, [{ path: ["email"], message: "Invalid email" }, { path: "password", message: "Too short" }]), FIELDS)).toEqual({ email: "Invalid email", password: "Too short" });
  });
  it("reads a { field: message } map", () => {
    expect(extractFieldErrors(err(422, { email: ["Already registered"] }), FIELDS)).toEqual({ email: "Already registered" });
  });
  it("ignores unknown fields and non-validation statuses", () => {
    expect(extractFieldErrors(err(400, [{ path: "secretInternal", message: "x" }]), FIELDS)).toEqual({});
    expect(extractFieldErrors(err(500, [{ path: "email", message: "x" }]), FIELDS)).toEqual({});
    expect(extractFieldErrors(new Error("boom"), FIELDS)).toEqual({});
  });
});
