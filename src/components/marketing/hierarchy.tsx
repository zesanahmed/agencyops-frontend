import { Building2, CalendarRange, FolderKanban, ListChecks, UsersRound } from "lucide-react";

const LEVELS = [
  { icon: Building2, name: "Organization", note: "One workspace per agency, with its own roles." },
  { icon: UsersRound, name: "Teams", note: "Operational units assigned to projects." },
  { icon: FolderKanban, name: "Projects", note: "Each engagement, with status and people." },
  { icon: CalendarRange, name: "Sprints", note: "Time-boxed goals: planned, active, completed." },
  { icon: ListChecks, name: "Tasks", note: "Priority, assignee, subtasks, collaborators, comments." },
];

/** The product's real structure, drawn as a hierarchy rather than a fake screenshot. */
export function Hierarchy() {
  return (
    <ol aria-label="How AgencyOps is organized" className="relative space-y-3 border-l border-border-strong pl-6">
      {LEVELS.map((l, i) => (
        <li key={l.name} className="relative rounded-lg border border-border bg-surface p-4" style={{ marginLeft: `${i * 0.75}rem` }}>
          <span className="absolute -left-[2.05rem] top-5 size-2.5 rounded-full border-2 border-background bg-primary" aria-hidden />
          <div className="flex items-start gap-3">
            <l.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div><p className="text-sm font-medium">{l.name}</p><p className="text-sm text-muted-foreground">{l.note}</p></div>
          </div>
        </li>
      ))}
    </ol>
  );
}
