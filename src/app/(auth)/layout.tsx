import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
      <aside className="hidden flex-col justify-between border-r border-border bg-surface-muted p-12 lg:flex">
        <Logo />
        <div className="max-w-md space-y-6">
          <p className="text-3xl font-semibold leading-tight tracking-tight">Every project, sprint and task — one calm place to run the agency.</p>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li>Separate organizations with owner, manager and team-member roles.</li>
            <li>Projects, sprints and tasks with subtasks and collaborators.</li>
            <li>Comments with @mentions and an inbox that keeps up.</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Built for small software agencies.</p>
      </aside>
      <main id="main" className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden"><Logo /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
