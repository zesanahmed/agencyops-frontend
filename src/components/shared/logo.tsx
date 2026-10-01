import Link from "next/link";
import { cn } from "@/lib/utils";

/** Mark: three ascending bars — work moving from planned to shipped. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", className)} aria-hidden fill="none">
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <rect x="5.5" y="12.5" width="3" height="6" rx="1" className="fill-primary-foreground/60" />
      <rect x="10.5" y="9" width="3" height="9.5" rx="1" className="fill-primary-foreground/80" />
      <rect x="15.5" y="5.5" width="3" height="13" rx="1" className="fill-primary-foreground" />
    </svg>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)} aria-label="AgencyOps home">
      <LogoMark />
      <span>AgencyOps</span>
    </Link>
  );
}
