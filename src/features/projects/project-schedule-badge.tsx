import { AlarmClock, CalendarClock, CalendarX2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { projectSchedule, scheduleLabel } from "./project-metrics";
import type { Project } from "@/types/domain";

/** Shows only when a due date needs attention (overdue or due within a week). Text + icon, never colour alone. */
export function ProjectScheduleBadge({ project, now }: { project: Pick<Project, "status" | "dueDate">; now?: number }) {
  const s = projectSchedule(project, now);
  if (s.state === "overdue") return <Badge tone="danger"><CalendarX2 className="size-3" aria-hidden />{scheduleLabel(s)}</Badge>;
  if (s.state === "due-soon") return <Badge tone="warning"><AlarmClock className="size-3" aria-hidden />{scheduleLabel(s)}</Badge>;
  if (s.state === "on-track") return <Badge tone="neutral"><CalendarClock className="size-3" aria-hidden />{scheduleLabel(s)}</Badge>;
  return null;
}
