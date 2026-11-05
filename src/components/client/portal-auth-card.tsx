import { Logo } from "@/components/shared/logo";

/** Standalone, calm card for the portal's sign-in and invitation pages (outside the portal shell). */
export function PortalAuthCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-muted px-4 py-12">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2">Skip to content</a>
      <main id="main" className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center"><Logo /><span className="rounded-sm bg-surface px-2 py-0.5 text-xs text-muted-foreground">Client portal</span></div>
        <div className="space-y-6 rounded-lg border border-border bg-surface p-6 shadow-(--shadow-card) sm:p-8">
          <div className="space-y-1"><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{description ? <p className="text-sm text-muted-foreground">{description}</p> : null}</div>
          {children}
        </div>
      </main>
    </div>
  );
}
