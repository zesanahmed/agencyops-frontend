import { describe, expect, it } from "vitest";
import { formatCalendarDate, fromDateInputValue, toDateInputValue } from "./format";

describe("calendar date helpers", () => {
  it("formats UTC-midnight dates as that calendar day regardless of the viewer's time zone", () => {
    expect(formatCalendarDate("2026-01-01T00:00:00.000Z")).toBe("Jan 1, 2026");
    expect(formatCalendarDate("2026-12-31T00:00:00.000Z")).toBe("Dec 31, 2026");
  });
  it("shows a dash for missing or invalid values", () => {
    expect(formatCalendarDate(null)).toBe("—");
    expect(formatCalendarDate("nope")).toBe("—");
  });
  it("round-trips a date input value through the backend's ISO format", () => {
    expect(fromDateInputValue("2026-03-09")).toBe("2026-03-09T00:00:00.000Z");
    expect(toDateInputValue("2026-03-09T00:00:00.000Z")).toBe("2026-03-09");
    expect(toDateInputValue(null)).toBe("");
    expect(toDateInputValue("bad")).toBe("");
  });
});
