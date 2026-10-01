"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Logo } from "@/components/shared/logo";
import { Breadcrumbs } from "./breadcrumbs";
import { NotificationBell } from "./notification-bell";
import { OrgGuard } from "./org-guard";
import { OrgProvider } from "@/features/organizations/org-context";
import { SidebarNav } from "./sidebar";
import { UserMenu } from "./user-menu";

export function OrgShell({ organizationId, children }: { organizationId: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <OrgProvider organizationId={organizationId}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-(--shadow-pop)">Skip to content</a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface lg:block"><SidebarNav organizationId={organizationId} /></aside>
        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu /></Button>
              <Logo href="/organizations" />
            </div>
            <div className="hidden min-w-0 flex-1 lg:block"><Breadcrumbs organizationId={organizationId} /></div>
            <div className="ml-auto flex items-center gap-1"><NotificationBell organizationId={organizationId} /><UserMenu /></div>
          </header>
          <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6"><OrgGuard organizationId={organizationId}>{children}</OrgGuard></main>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent side="right" className="left-0 right-auto max-w-72 p-0" >
          <div className="sr-only"><DialogHeader title="Navigation" /></div>
          {/* Own header row so the built-in close button never overlaps the org switcher. */}
          <div className="flex h-14 items-center border-b border-border px-4"><Logo href="/organizations" /></div>
          <SidebarNav organizationId={organizationId} onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </OrgProvider>
  );
}
