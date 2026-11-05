"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/features/portal/portal-auth-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/client", label: "Overview", exact: true },
  { href: "/client/projects", label: "Projects" },
  { href: "/client/files", label: "Files" },
  { href: "/client/invoices", label: "Invoices" },
];

/** Deliberately simpler and calmer than the internal workspace shell: a client sees projects, files and invoices, nothing else. */
export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { contact, logout, logoutAll } = usePortalAuth();
  return (
    <div className="min-h-dvh bg-surface-muted">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="hidden truncate rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground sm:inline">{contact?.organizationName ? `${contact.organizationName} · Client portal` : "Client portal"}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden max-w-40 truncate text-sm text-muted-foreground md:inline" title={contact?.email}>{contact?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => void logout()} aria-label="Sign out"><LogOut /><span className="hidden sm:inline">Sign out</span></Button>
          </div>
        </div>
        <nav aria-label="Client portal" className="mx-auto max-w-4xl overflow-x-auto px-4 sm:px-6">
          <ul className="flex gap-1 text-sm">
            {NAV.map((n) => {
              const active = n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(`${n.href}/`);
              return (
                <li key={n.href}>
                  <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("block border-b-2 px-3 py-2.5 transition-colors", active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{n.label}</Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-4xl px-4 pb-8 text-xs text-muted-foreground sm:px-6">
        Signed in as {contact?.name} ({contact?.clientOrganizationName}). <button type="button" className="underline-offset-2 hover:underline" onClick={() => void logoutAll()}>Sign out of all devices</button>
      </footer>
    </div>
  );
}
