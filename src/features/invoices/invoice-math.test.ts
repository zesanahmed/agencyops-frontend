import { describe, expect, it } from "vitest";
import { lineAmountCents, previewTotals } from "./invoice-math";
import { invoiceSchema, type InvoiceValues } from "./schemas";

const line = (description: string, quantity: string, unitPrice: string) => ({ description, quantity, unitPrice });

describe("previewTotals mirrors the backend (total = subtotal - discount + tax)", () => {
  it("sums lines", () => {
    const t = previewTotals([line("a", "2", "100.00"), line("b", "1", "49.99")], "10", "5.50");
    expect(t).toMatchObject({ subtotalCents: 24999, taxCents: 1000, discountCents: 550, totalCents: 25449, error: null });
  });
  it("treats unfinished lines as zero and blank tax/discount as zero", () => {
    expect(previewTotals([line("a", "", "10")], "", "")).toMatchObject({ subtotalCents: 0, totalCents: 0 });
  });
  it("flags a discount larger than the invoice (the backend's 422)", () => {
    expect(previewTotals([line("a", "1", "10")], "0", "20").error).toBe("Discount cannot exceed the invoice amount");
  });
  it("flags a total beyond the Postgres INT the backend stores", () => {
    expect(previewTotals([line("a", "100000", "20000")], "0", "0").error).toBe("Invoice total is too large");
  });
  it("lineAmountCents needs a whole quantity 1..100000 and a valid price", () => {
    expect(lineAmountCents({ quantity: "3", unitPrice: "2.50" })).toBe(750);
    for (const q of ["0", "1.5", "-1", "100001", "x"]) expect(lineAmountCents({ quantity: q, unitPrice: "1" })).toBeNull();
    expect(lineAmountCents({ quantity: "1", unitPrice: "abc" })).toBeNull();
  });
});

describe("invoiceSchema (mirrors invoice.validation.ts)", () => {
  const ok: InvoiceValues = { clientId: "c1", projectId: "", issueDate: "2026-10-01", dueDate: "2026-10-15", currency: "usd", items: [line("Design", "1", "100")], tax: "0", discount: "0", notes: "" };
  const issues = (v: Partial<InvoiceValues>) => { const r = invoiceSchema.safeParse({ ...ok, ...v }); return r.success ? [] : r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`); };

  it("accepts a valid invoice", () => expect(issues({})).toEqual([]));
  it("requires a client and both dates", () => {
    expect(issues({ clientId: "" })).toEqual(["clientId: Choose a client"]);
    expect(issues({ issueDate: "" })).toEqual(["issueDate: Issue date is required"]);
  });
  it("rejects a due date before the issue date", () => expect(issues({ dueDate: "2026-09-30" })).toEqual(["dueDate: Due date can't be before the issue date"]));
  it("needs 1–50 items with valid quantity and price", () => {
    expect(issues({ items: [] })).toEqual(["items: Add at least one line item"]);
    expect(issues({ items: Array.from({ length: 51 }, () => line("x", "1", "1")) })).toEqual(["items: At most 50 line items"]);
    expect(issues({ items: [line("", "1", "1")] })).toEqual(["items.0.description: Description is required"]);
    expect(issues({ items: [line("x", "0", "1")] })[0]).toMatch(/quantity/);
    expect(issues({ items: [line("x", "1", "1.234")] })[0]).toMatch(/unitPrice/);
  });
  it("allows a free line (price 0) but not a discount above the amount", () => {
    expect(issues({ items: [line("x", "1", "0")] })).toEqual([]);
    expect(issues({ discount: "500" })).toEqual(["discount: Discount cannot exceed the invoice amount"]);
  });
  it("validates tax, discount and currency format", () => {
    expect(issues({ tax: "-1" })[0]).toMatch(/^tax:/);
    expect(issues({ discount: "abc" })[0]).toMatch(/^discount:/);
    expect(issues({ currency: "US" })[0]).toMatch(/^currency:/);
  });
  it("caps notes at 5000", () => expect(issues({ notes: "x".repeat(5001) })).toEqual(["notes: Notes are too long"]));
});
