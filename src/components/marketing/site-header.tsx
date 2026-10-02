import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { HeaderActions } from "./header-actions";

const NAV = [
  { href: "/services", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="hover:text-foreground">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2"><HeaderActions /></div>
      </div>
      <nav aria-label="Main (mobile)" className="flex gap-5 overflow-x-auto border-t border-border px-4 py-2 text-sm text-muted-foreground md:hidden">
        {NAV.map((n) => <Link key={n.href} href={n.href} className="whitespace-nowrap hover:text-foreground">{n.label}</Link>)}
      </nav>
    </header>
  );
}
