import { describe, expect, it } from "vitest";
import { centsToInput, formatMoney, MAX_CENTS, parseMoneyToCents } from "./money";

describe("parseMoneyToCents", () => {
  it.each([["12", 1200], ["12.5", 1250], ["12.50", 1250], ["0", 0], ["0.07", 7], ["1,200.50", 120050], [" 3.10 ", 310]])("%s -> %i", (input, cents) => expect(parseMoneyToCents(input)).toBe(cents));
  it("avoids floating point drift (19.99 * 100 is 1998.9999… in JS floats)", () => expect(parseMoneyToCents("19.99")).toBe(1999));
  it.each(["", "abc", "-5", "1.234", "1.", ".5", "1e3", "12.5.0", "$5"])("rejects %j", (input) => expect(parseMoneyToCents(input)).toBeNull());
});

describe("formatting", () => {
  it("formats cents in the invoice currency", () => {
    expect(formatMoney(123456, "usd")).toBe("$1,234.56");
    expect(formatMoney(5, "usd")).toBe("$0.05");
    expect(formatMoney(100000, "eur")).toContain("1,000.00");
  });
  it("falls back for an unknown currency code instead of throwing", () => expect(formatMoney(1050, "zz")).toMatch(/10\.50/));
  it("centsToInput is the inverse of parseMoneyToCents", () => {
    for (const c of [0, 7, 100, 1999, 120050, MAX_CENTS]) expect(parseMoneyToCents(centsToInput(c))).toBe(c);
    expect(centsToInput(5)).toBe("0.05");
  });
});
