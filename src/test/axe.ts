import axe from "axe-core";
import type { AxeResults } from "axe-core";

/**
 * Runs axe-core (WCAG 2 A/AA rules) on rendered DOM and returns readable violation lines. jsdom has no layout engine, so the
 * colour-contrast rule can't run here (contrast is checked by design tokens instead), and `region` is meaningless for a
 * component rendered without its page landmarks.
 */
export async function a11yViolations(container: Element): Promise<string[]> {
  const results: AxeResults = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });
  return results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(" | ")})`);
}
