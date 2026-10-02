import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Guards a class of App Router mistake: a page/layout that reads a dynamic
 * param (e.g. `organizationId`) but does not live under the matching `[param]`
 * folder. Route groups like `(app)` add no URL segment, so a layout placed
 * directly in `(app)/` is route "/" and receives NO params — Next's generated
 * route types reject it (LayoutConfig<"/">), but only once those types exist.
 * This test catches it without needing a build.
 */
interface RouteFile { path: string; source: string }

const PARAMS_TYPE = /params\s*:\s*Promise<\{([^}]*)\}>/;

export function declaredParams(source: string): string[] {
  const m = PARAMS_TYPE.exec(source);
  if (!m) return [];
  return [...m[1].matchAll(/([A-Za-z_]\w*)\s*\??\s*:/g)].map((x) => x[1]);
}

export function dynamicSegments(routePath: string): Set<string> {
  const out = new Set<string>();
  for (const seg of routePath.split("/")) {
    const m = /^\[{1,2}(?:\.\.\.)?(\w+)\]{1,2}$/.exec(seg);
    if (m) out.add(m[1]);
  }
  return out;
}

export function checkParamsAlignment(files: RouteFile[]): string[] {
  const problems: string[] = [];
  for (const f of files) {
    const available = dynamicSegments(f.path);
    for (const p of declaredParams(f.source))
      if (!available.has(p)) problems.push(`${f.path}: reads params.${p} but has no [${p}] folder in its path`);
  }
  return problems;
}

function collect(dir: string, base = dir): RouteFile[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return collect(full, base);
    return /^(layout|page)\.tsx$|^route\.ts$/.test(e.name)
      ? [{ path: path.relative(base, full).split(path.sep).join("/"), source: readFileSync(full, "utf8") }]
      : [];
  });
}

describe("App Router route/param alignment", () => {
  const files = collect(path.join(process.cwd(), "src/app"));

  it("scans the real route tree", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.some((f) => f.path === "(app)/organizations/[organizationId]/layout.tsx")).toBe(true);
  });

  it("every page/layout only reads params that its folder path provides", () => {
    expect(checkParamsAlignment(files)).toEqual([]);
  });

  it("the (app) group layout sits at route '/' and must not take params", () => {
    const appLayout = files.find((f) => f.path === "(app)/layout.tsx");
    expect(appLayout).toBeDefined();
    expect(declaredParams(appLayout!.source)).toEqual([]);
  });

  it("detects the reported mistake: org layout placed directly in (app)/", () => {
    const bad: RouteFile = {
      path: "(app)/layout.tsx",
      source: "export default async function OrganizationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ organizationId: string }> }) {}",
    };
    expect(checkParamsAlignment([bad])).toEqual(["(app)/layout.tsx: reads params.organizationId but has no [organizationId] folder in its path"]);
  });

  it("accepts correct placement, multiple params, and catch-all segments", () => {
    const ok: RouteFile[] = [
      { path: "(app)/organizations/[organizationId]/layout.tsx", source: "params: Promise<{ organizationId: string }>" },
      { path: "(app)/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/page.tsx", source: "params: Promise<{ projectId: string; taskId: string }>" },
      { path: "docs/[...slug]/page.tsx", source: "params: Promise<{ slug: string[] }>" },
    ];
    expect(checkParamsAlignment(ok)).toEqual([]);
  });
});
