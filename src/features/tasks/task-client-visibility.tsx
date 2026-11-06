"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrg } from "@/features/organizations/org-context";
import { collabApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";
import { TaskField } from "./task-field";

/**
 * Whether this task is shown on the client's portal. The backend can set it but doesn't report the current value on task
 * reads (only in the PATCH response), so when `initial` is unknown the control sets it explicitly instead of pretending.
 */
export function TaskClientVisibility({ projectId, taskId, initial }: { projectId: string; taskId: string; initial?: boolean }) {
  const { organizationId: o, can } = useOrg();
  const [visible, setVisible] = useState<boolean | undefined>(initial);
  const set = useAction({ fn: (v: boolean) => collabApi.setTaskVisibility(o, projectId, taskId, v), success: (v) => (v ? "Task is now visible to the client" : "Task is hidden from the client") });
  if (!can("client-portal:manage")) return null;
  const apply = (v: boolean) => set.mutate(v, { onSuccess: (confirmed) => setVisible(confirmed) });

  return (
    <TaskField label="Client portal">
      {visible === undefined ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={set.isPending} onClick={() => apply(true)}><Eye /> Show to client</Button>
            <Button size="sm" variant="ghost" disabled={set.isPending} onClick={() => apply(false)}><EyeOff /> Hide</Button>
          </div>
          <p className="text-xs text-muted-foreground">Tasks are private to your team until you show them.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm">{visible ? <><Eye className="size-4 text-success" aria-hidden /> Visible to the client</> : <><EyeOff className="size-4 text-muted-foreground" aria-hidden /> Hidden from the client</>}</p>
          <Button size="sm" variant="secondary" loading={set.isPending} onClick={() => apply(!visible)}>{visible ? "Hide from client" : "Show to client"}</Button>
        </div>
      )}
    </TaskField>
  );
}
