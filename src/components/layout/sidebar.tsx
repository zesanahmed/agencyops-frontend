"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Bell, FolderKanban, LayoutDashboard, ListChecks, Settings, UsersRound, UserSquare2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationApi } from "@/lib/api/services";
import { qk, useOrganization } from "@/features/organizations/hooks";
import { OrgSwitcher } from "./org-switcher";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

interface NavItem { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: number }
interface NavGroup { label: string; items: NavItem[] }

export function SidebarNav({ organizationId, onNavigate }: { organizationId: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const base = `/organizations/${organizationId}`;
  const org = useOrganization(organizationId);
  const unread = useQuery({
    queryKey: qk.notifications(organizationId, { unreadOnly: true, limit: 1 }),
    queryFn: () => notificationApi.list(organizationId, { unreadOnly: true, limit: 1 }),
    enabled: org.isSuccess,
    refetchInterval: 60_000,
  });
  const unreadCount = unread.data?.meta.total ?? 0;

  const groups: NavGroup[] = [
    { label: "Workspace", items: [
      { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
      { href: `${base}/my-work`, label: "My work", icon: ListChecks },
      { href: `${base}/projects`, label: "Projects", icon: FolderKanban },
    ]},
    { label: "People", items: [
      { href: `${base}/teams`, label: "Teams", icon: UserSquare2 },
      { href: `${base}/members`, label: "Members", icon: UsersRound },
    ]},
    { label: "Inbox", items: [
      { href: `${base}/notifications`, label: "Notifications", icon: Bell, badge: unreadCount },
      { href: `${base}/settings`, label: "Settings", icon: Settings },
    ]},
  ];

  return (
    <div className="flex h-full flex-col gap-5 p-3">
      <div className="hidden px-1 pt-1 lg:block"><Logo href="/organizations" /></div>
      <OrgSwitcher organizationId={organizationId} />
      <nav aria-label="Primary" className="flex-1 space-y-5 overflow-y-auto">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                      className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors", active ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-surface-muted hover:text-foreground")}>
                      <item.icon className="size-4" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground" aria-label={`${item.badge} unread`}>{item.badge > 99 ? "99+" : item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
