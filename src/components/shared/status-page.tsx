import type { LucideIcon } from "lucide-react";
import { Logo } from "./logo";

export function StatusPage({ icon: Icon, tone, title, children, actions }: {
  icon: LucideIcon; tone: "success" | "warning" | "danger" | "neutral"; title: string; children: React.ReactNode; actions?: React.ReactNode;
}) {
  const toneCls = { success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger", neutral: "bg-surface-muted text-muted-foreground" }[tone];
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <Logo />
      <span className={`flex size-12 items-center justify-center rounded-full ${toneCls}`}><Icon className="size-6" aria-hidden /></span>
      <div className="space-y-2"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><div className="text-sm text-muted-foreground">{children}</div></div>
      {actions ? <div className="flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </main>
  );
}
