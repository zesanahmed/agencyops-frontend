import { AlarmClock, CalendarClock, CalendarX2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { projectSchedule, scheduleLabel, type Schedule } from "./project-metrics";
import type { Project } from "@/types/domain";

/** Shows only when a due date is worth noticing. Always text + icon, never colour alone. */
export function ScheduleBadge({ schedule }: { schedule: Schedule }) {
  if (schedule.state === "overdue") return <Badge tone="danger"><CalendarX2 className="size-3" aria-hidden />{scheduleLabel(schedule)}</Badge>;
  if (schedule.state === "due-soon") return <Badge tone="warning"><AlarmClock className="size-3" aria-hidden />{scheduleLabel(schedule)}</Badge>;
  if (schedule.state === "on-track") return <Badge tone="neutral"><CalendarClock className="size-3" aria-hidden />{scheduleLabel(schedule)}</Badge>;
  return null;
}

export function ProjectScheduleBadge({ project, now }: { project: Pick<Project, "status" | "dueDate">; now?: number }) {
  return <ScheduleBadge schedule={projectSchedule(project, now)} />;
}
