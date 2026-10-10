import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Pins what each route file actually renders. Complements route-structure.test.ts
 * (which checks params vs folders): this catches COPY/PASTE mix-ups where a file
 * ends up holding another route's content — e.g. the organization root page holding
 * the Projects page, or its loading.tsx holding the project skeleton.
 */
const ORG = "(app)/organizations/[organizationId]";
const PAGES: { file: string; exportName: string; title: string }[] = [
  { file: "(app)/organizations/page.tsx", exportName: "OrganizationsPage", title: "Organizations" },
  { file: "(app)/profile/page.tsx", exportName: "ProfilePage", title: "Profile" },
  { file: `${ORG}/page.tsx`, exportName: "OverviewPage", title: "Overview" },
  { file: `${ORG}/projects/page.tsx`, exportName: "ProjectsPage", title: "Projects" },
  { file: `${ORG}/projects/[projectId]/page.tsx`, exportName: "ProjectPage", title: "Project" },
  { file: `${ORG}/projects/[projectId]/tasks/[taskId]/page.tsx`, exportName: "TaskPage", title: "Task" },
  { file: `${ORG}/teams/page.tsx`, exportName: "Page", title: "Teams" },
  { file: `${ORG}/teams/[teamId]/page.tsx`, exportName: "TeamPage", title: "Team" },
  { file: `${ORG}/members/page.tsx`, exportName: "Page", title: "Members" },
  { file: `${ORG}/notifications/page.tsx`, exportName: "Page", title: "Notifications" },
  { file: `${ORG}/settings/page.tsx`, exportName: "Page", title: "Settings" },
  { file: `${ORG}/my-work/page.tsx`, exportName: "Page", title: "My work" },
];
const LOADING: { file: string; ariaLabel: string }[] = [
  { file: `${ORG}/loading.tsx`, ariaLabel: "Loading" },
  { file: `${ORG}/projects/[projectId]/loading.tsx`, ariaLabel: "Loading project" },
  { file: `${ORG}/projects/[projectId]/tasks/[taskId]/loading.tsx`, ariaLabel: "Loading task" },
  { file: `${ORG}/teams/[teamId]/loading.tsx`, ariaLabel: "Loading team" },
];
const LAYOUTS: { file: string; exportName: string; mustContain: string; mustNotContain?: string }[] = [
  { file: "(app)/layout.tsx", exportName: "AppLayout", mustContain: "AuthGate", mustNotContain: "OrgShell" },
  { file: `${ORG}/layout.tsx`, exportName: "OrganizationLayout", mustContain: "OrgShell", mustNotContain: "AuthGate" },
];

const read = (rel: string) => readFileSync(path.join(process.cwd(), "src/app", rel), "utf8");
const defaultExport = (src: string) => /export default (?:async )?function (\w+)/.exec(src)?.[1];
const metaTitle = (src: string) => /export const metadata[^=]*=\s*\{\s*title:\s*"([^"]+)"/.exec(src)?.[1];

describe("route files hold their own route's content", () => {
  it.each(PAGES)("$file → $exportName ($title)", ({ file, exportName, title }) => {
    const src = read(file);
    expect(defaultExport(src)).toBe(exportName);
    expect(metaTitle(src)).toBe(title);
  });

  it.each(LOADING)("$file shows the matching skeleton ($ariaLabel)", ({ file, ariaLabel }) => {
    expect(read(file)).toContain(`aria-label="${ariaLabel}"`);
  });

  it.each(LAYOUTS)("$file is $exportName", ({ file, exportName, mustContain, mustNotContain }) => {
    const src = read(file);
    expect(defaultExport(src)).toBe(exportName);
    expect(src).toContain(mustContain);
    if (mustNotContain) expect(src).not.toContain(mustNotContain);
  });

  it("the organization root is the Overview, not the Projects list", () => {
    const src = read(`${ORG}/page.tsx`);
    expect(src).toContain("Overview");
    expect(src).not.toContain("ProjectList");
  });
});
