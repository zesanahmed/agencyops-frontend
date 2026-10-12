import { describe, expect, it } from "vitest";
import { applyMention, extractMentionIds, findMentionQuery, splitMentions, suggestMembers, MAX_MENTIONS } from "./mentions";

const M = [{ id: "1", name: "Ann" }, { id: "2", name: "Annabel Lee" }, { id: "3", name: "Ben" }, { id: "4", name: "Zesan Ahmed" }];

describe("extractMentionIds", () => {
  it("returns exactly the people whose @Name is in the text", () => {
    expect(extractMentionIds("Hi @Ben and @Zesan Ahmed, please look", M)).toEqual(["3", "4"]);
    expect(extractMentionIds("no mentions here, just Ben", M)).toEqual([]);
  });
  it("does not let @Annabel Lee also mention Ann, or @Ann mention Annabel", () => {
    expect(extractMentionIds("cc @Annabel Lee", M)).toEqual(["2"]);
    expect(extractMentionIds("cc @Ann.", M)).toEqual(["1"]);
    expect(extractMentionIds("cc @Annabel", M)).toEqual([]);
  });
  it("ignores an @ glued to a word (emails) and counts each person once", () => {
    expect(extractMentionIds("mail me at x@Ben.com", M)).toEqual([]);
    expect(extractMentionIds("@Ben @Ben (@Ben)", M)).toEqual(["3"]);
  });
  it("is safe with regex characters in names and stays within the backend limit", () => {
    expect(extractMentionIds("hi @A.B (qa)", [{ id: "x", name: "A.B (qa)" }, { id: "y", name: "AxB (qa)" }])).toEqual(["x"]);
    const many = Array.from({ length: 80 }, (_, i) => ({ id: String(i), name: `P${String(i).padStart(2, "0")}` }));
    expect(extractMentionIds(many.map((m) => `@${m.name}`).join(" "), many)).toHaveLength(MAX_MENTIONS);
  });
});

describe("splitMentions", () => {
  it("splits known @Names out of the text, preferring the longest name", () => {
    expect(splitMentions("Thanks @Annabel Lee and @Ben!", M.map((m) => m.name))).toEqual([
      { text: "Thanks ", mention: false }, { text: "@Annabel Lee", mention: true },
      { text: " and ", mention: false }, { text: "@Ben", mention: true }, { text: "!", mention: false },
    ]);
  });
  it("leaves unknown @handles and plain text alone", () => {
    expect(splitMentions("ping @nobody", ["Ben"])).toEqual([{ text: "ping @nobody", mention: false }]);
    expect(splitMentions("hello", [])).toEqual([{ text: "hello", mention: false }]);
  });
  it("never produces markup: HTML in the text stays plain text", () => {
    const parts = splitMentions("<img src=x onerror=alert(1)> @Ben", ["Ben"]);
    expect(parts.map((p) => p.text).join("")).toBe("<img src=x onerror=alert(1)> @Ben");
  });
});

describe("findMentionQuery", () => {
  it("finds the token being typed at the caret", () => {
    expect(findMentionQuery("hello @be", 9)).toEqual({ start: 6, query: "be" });
    expect(findMentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(findMentionQuery("hi @Ann Le", 10)).toEqual({ start: 3, query: "Ann Le" });
  });
  it("ignores @ inside words, across lines, and when the query is too long", () => {
    expect(findMentionQuery("x@be", 4)).toBeNull();
    expect(findMentionQuery("@be\nnext", 8)).toBeNull();
    expect(findMentionQuery("no at sign", 5)).toBeNull();
    expect(findMentionQuery(`@${"a".repeat(41)}`, 42)).toBeNull();
  });
});

describe("suggestMembers / applyMention", () => {
  it("lists prefix matches before contains-matches, and everyone for a bare @", () => {
    expect(suggestMembers(M, "an").map((m) => m.id)).toEqual(["1", "2", "4"]);
    expect(suggestMembers(M, "").map((m) => m.id)).toEqual(["1", "2", "3", "4"]);
    expect(suggestMembers(M, "zzz")).toEqual([]);
    expect(suggestMembers(M, "ben ")).toEqual([]); // a finished name + space closes the list
    expect(suggestMembers(M, "zesan ").map((m) => m.id)).toEqual(["4"]); // multi-word names keep matching
    expect(suggestMembers(M, "", 2)).toHaveLength(2);
  });
  it("replaces the typed token and places the caret after the inserted name", () => {
    expect(applyMention("hi @be there", 6, 3, "Ben")).toEqual({ text: "hi @Ben  there", caret: 8 });
    expect(applyMention("@", 1, 0, "Ann")).toEqual({ text: "@Ann ", caret: 5 });
  });
});
