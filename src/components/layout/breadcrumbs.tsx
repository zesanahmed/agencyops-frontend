"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { projectApi } from "@/lib/api/services";
import { buildCrumbs } from "@/lib/breadcrumbs";
import { qk, useOrganization } from "@/features/organizations/hooks";
import { useAuthStore } from "@/stores/auth-store";

export function Breadcrumbs({ organizationId }: { organizationId: string }) {
  const pathname = usePathname();
  const projectId = pathname.match(/\/projects\/([^/]+)/)?.[1];
  const org = useOrganization(organizationId);
  const authed = useAuthStore((s) => s.status === "authenticated");
  // Same key as the project workspace, so this reuses its cache instead of refetching.
  const project = useQuery({ queryKey: qk.project(organizationId, projectId ?? ""), queryFn: () => projectApi.get(organizationId, projectId!), enabled: authed && Boolean(projectId) });

  const crumbs = buildCrumbs(pathname, { org: org.data?.name, project: project.data?.name });
  if (crumbs.length < 2) return null;
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={`flex min-w-0 items-center gap-1 ${i === 0 && !last ? "hidden sm:flex" : ""}`}>
              {i > 0 ? <ChevronRight className="size-3.5 shrink-0" aria-hidden /> : null}
              {c.href && !last ? <Link href={c.href} className="truncate hover:text-foreground">{c.label}</Link>
                : <span className="truncate font-medium text-foreground" aria-current={last ? "page" : undefined}>{c.label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
