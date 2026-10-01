import Link from "next/link";
import { Logo } from "@/components/shared/logo";

const NAV = [
  { href: "/client", label: "Overview" },
  { href: "/client/projects", label: "Projects" },
  { href: "/client/files", label: "Files" },
  { href: "/client/invoices", label: "Invoices" },
];

/** Deliberately simpler and calmer than the internal workspace shell. */
export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface-muted">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3"><Logo /><span className="rounded-sm bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">Client portal</span></div>
          <nav aria-label="Client portal" className="flex gap-4 text-sm text-muted-foreground">{NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-foreground">{n.label}</Link>)}</nav>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
