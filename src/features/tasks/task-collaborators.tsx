"use client";

import { X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemberDirectory } from "@/features/members/use-member-directory";
import { useOrg } from "@/features/organizations/org-context";
import { useAddCollaborator, useCollaborators, useRemoveCollaborator } from "./hooks";
import { TaskField } from "./task-field";

export function TaskCollaborators({ projectId, taskId }: { projectId: string; taskId: string }) {
  const { organizationId: o, can } = useOrg();
  const { data, isLoading } = useCollaborators(o, projectId, taskId);
  const directory = useMemberDirectory(o);
  const add = useAddCollaborator(o, projectId, taskId);
  const remove = useRemoveCollaborator(o, projectId, taskId);
  const taken = new Set(data?.map((c) => c.membershipId));
  return (
    <TaskField label="Collaborators">
      {isLoading ? <Skeleton className="h-8" /> : data?.length ? (
        <ul className="space-y-1.5">
          {data.map((c) => {
            const name = directory.nameOf(c.membershipId);
            return (
              <li key={c.id} className="flex items-center gap-2 text-sm"><Avatar name={name} size="sm" /><span className="flex-1 truncate">{name}</span>
                {can("task:update") ? <button className="rounded-sm p-1 text-muted-foreground hover:bg-surface-muted" aria-label={`Remove ${name}`} onClick={() => remove.mutate(c.id)}><X className="size-3.5" /></button> : null}</li>
            );
          })}
        </ul>
      ) : <p className="text-sm text-muted-foreground">No collaborators.</p>}
      {can("task:update") ? (
        <Select aria-label="Add collaborator" value="" disabled={add.isPending} onChange={(e) => e.target.value && add.mutate(e.target.value)}>
          <option value="">Add collaborator…</option>
          {directory.list.filter((m) => !taken.has(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </Select>
      ) : null}
    </TaskField>
  );
}
