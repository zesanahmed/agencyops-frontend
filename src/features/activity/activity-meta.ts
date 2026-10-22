import { ArrowRightLeft, CalendarRange, FolderKanban, ListChecks, MessageSquare, Play, UserCheck, UserMinus, UserPlus, CheckCheck, Trash2, Pencil, Plus, type LucideIcon } from "lucide-react";
import type { Activity } from "@/types/domain";

/** Every action the backend records (FRONTEND_CONTRACT §3.6). Unknown ones fall back to a neutral icon. */
const ICONS: Record<string, LucideIcon> = {
  "project.created": FolderKanban, "project.updated": Pencil, "project.deleted": Trash2,
  "sprint.created": CalendarRange, "sprint.updated": Pencil, "sprint.started": Play, "sprint.completed": CheckCheck, "sprint.deleted": Trash2,
  "task.created": Plus, "task.updated": Pencil, "task.status_changed": ArrowRightLeft, "task.assigned": UserCheck, "task.deleted": Trash2,
  "comment.added": MessageSquare, "member.joined": UserPlus, "member.removed": UserMinus,
};

export const activityIcon = (action: string): LucideIcon => ICONS[action] ?? ListChecks;

/** "task.status_changed" -> "Task status changed" (used only as a screen-reader/tooltip label; the visible text is the server's `summary`). */
export function actionLabel(action: string): string {
  const t = action.replace(/[._]/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Entity filter options, in the order the backend validates them. */
export const ENTITY_FILTERS: { value: string; label: string }[] = [
  { value: "Project", label: "Projects" },
  { value: "Sprint", label: "Sprints" },
  { value: "Task", label: "Tasks" },
  { value: "Comment", label: "Comments" },
  { value: "Membership", label: "Members" },
];

/**
 * Where an entry leads. Deleted entities have no page, and neither do organization-level entries (no project):
 * member events lead to the members list.
 */
export function activityHref(organizationId: string, a: Pick<Activity, "action" | "projectId" | "taskId" | "entityType">): string | null {
  const base = `/organizations/${organizationId}`;
  if (a.action.endsWith(".deleted")) return null;
  if (a.entityType === "Membership") return a.action === "member.removed" ? null : `${base}/members`;
  if (a.projectId && a.taskId) return `${base}/projects/${a.projectId}/tasks/${a.taskId}`;
  if (a.projectId) return `${base}/projects/${a.projectId}`;
  return null;
}
