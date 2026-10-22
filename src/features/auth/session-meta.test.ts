import { describe, expect, it } from "vitest";
import { describeUserAgent } from "./session-meta";

describe("describeUserAgent", () => {
  it.each([
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36", "Chrome on Windows"],
    ["Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0", "Edge on Windows"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", "Safari on macOS"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1", "Safari on iOS"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0", "Firefox on Linux"],
    ["PostmanRuntime/7.36.0", "API client"],
  ])("%s", (ua, label) => expect(describeUserAgent(ua)).toBe(label));
  it("falls back for missing or unrecognized agents", () => {
    expect(describeUserAgent(null)).toBe("Unknown device");
    expect(describeUserAgent("???")).toBe("Unknown device");
  });
});
