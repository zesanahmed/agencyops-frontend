import { CheckCircle2, Circle, CircleDashed, CircleDot, Clock, Ban, PauseCircle, Flame, ArrowUp, ArrowRight, ArrowDown, PlayCircle, Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";

interface Def { label: string; tone: BadgeTone; icon: LucideIcon }
const humanize = (v: string) => v.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const PROJECT: Record<string, Def> = {
  PLANNING: { label: "Planning", tone: "info", icon: CircleDashed },
  ACTIVE: { label: "Active", tone: "success", icon: PlayCircle },
  ON_HOLD: { label: "On hold", tone: "warning", icon: PauseCircle },
  COMPLETED: { label: "Completed", tone: "primary", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", tone: "neutral", icon: Ban },
};
const TASK: Record<string, Def> = {
  BACKLOG: { label: "Backlog", tone: "neutral", icon: Inbox },
  TODO: { label: "To do", tone: "neutral", icon: Circle },
  IN_PROGRESS: { label: "In progress", tone: "info", icon: CircleDot },
  IN_REVIEW: { label: "In review", tone: "warning", icon: Clock },
  DONE: { label: "Done", tone: "success", icon: CheckCircle2 },
};
const PRIORITY: Record<string, Def> = {
  LOW: { label: "Low", tone: "neutral", icon: ArrowDown },
  MEDIUM: { label: "Medium", tone: "info", icon: ArrowRight },
  HIGH: { label: "High", tone: "warning", icon: ArrowUp },
  URGENT: { label: "Urgent", tone: "danger", icon: Flame },
};
const SPRINT: Record<string, Def> = {
  PLANNED: { label: "Planned", tone: "neutral", icon: CircleDashed },
  ACTIVE: { label: "Active", tone: "success", icon: PlayCircle },
  COMPLETED: { label: "Completed", tone: "primary", icon: CheckCircle2 },
};

function render(map: Record<string, Def>, value: string) {
  const d = map[value] ?? { label: humanize(value), tone: "neutral" as BadgeTone, icon: Circle };
  const Icon = d.icon;
  return <Badge tone={d.tone}><Icon className="size-3" aria-hidden />{d.label}</Badge>;
}

export const ProjectStatusBadge = ({ status }: { status: string }) => render(PROJECT, status);
export const TaskStatusBadge = ({ status }: { status: string }) => render(TASK, status);
export const PriorityBadge = ({ priority }: { priority: string }) => render(PRIORITY, priority);
export const SprintStatusBadge = ({ status }: { status: string }) => render(SPRINT, status);

export { PROJECT_STATUSES, TASK_STATUSES, TASK_PRIORITIES } from "@/types/domain";
export const statusLabel = {
  project: (v: string) => PROJECT[v]?.label ?? humanize(v),
  task: (v: string) => TASK[v]?.label ?? humanize(v),
  priority: (v: string) => PRIORITY[v]?.label ?? humanize(v),
};
