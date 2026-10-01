export interface Crumb { label: string; href?: string }

const SEGMENT_LABEL: Record<string, string> = {
  "my-work": "My work", projects: "Projects", teams: "Teams", members: "Members",
  notifications: "Notifications", settings: "Settings", tasks: "Tasks",
};

/**
 * Builds breadcrumbs for /organizations/[orgId]/... paths. Pure, so it is unit
 * tested; entity names (org/project) are injected by the caller from cached queries.
 */
export function buildCrumbs(pathname: string, names: { org?: string; project?: string } = {}): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "organizations" || parts.length < 2) return [];
  const orgId = parts[1];
  const base = `/organizations/${orgId}`;
  const crumbs: Crumb[] = [{ label: names.org ?? "Organization", href: parts.length > 2 ? base : undefined }];

  const rest = parts.slice(2);
  if (!rest.length) return crumbs;

  const section = rest[0];
  crumbs.push({ label: SEGMENT_LABEL[section] ?? section, href: rest.length > 1 ? `${base}/${section}` : undefined });

  if (section === "projects" && rest[1]) {
    const projectHref = `${base}/projects/${rest[1]}`;
    crumbs.push({ label: names.project ?? "Project", href: rest.length > 2 ? projectHref : undefined });
    if (rest[2] === "tasks" && rest[3]) crumbs.push({ label: "Task" });
  }
  return crumbs;
}
