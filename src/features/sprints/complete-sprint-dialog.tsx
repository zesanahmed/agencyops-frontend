"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/input";
import type { Sprint } from "@/types/domain";

/** What to do with the sprint's unfinished tasks. "" = leave them in the completed sprint (the backend default). */
export type OpenTaskTarget = "" | "BACKLOG" | string;

export function CompleteSprintDialog({ sprint, openCount, totalCount, targets, onOpenChange, onConfirm }: {
  sprint: Sprint | null; openCount: number; totalCount: number;
  /** Other sprints that can still receive tasks (not completed, not this one). */
  targets: Sprint[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (sprintId: string, moveOpenTasksTo: OpenTaskTarget) => Promise<unknown>;
}) {
  const [target, setTarget] = useState<OpenTaskTarget>("BACKLOG");
  const [pending, setPending] = useState(false);
  if (!sprint) return null;
  const confirm = async () => {
    setPending(true);
    try { await onConfirm(sprint.id, openCount ? target : ""); onOpenChange(false); } catch { /* the mutation toasts its own error; keep the dialog open */ } finally { setPending(false); }
  };
  return (
    <Dialog open onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader title={`Complete ${sprint.name}?`} description="A completed sprint can't be reopened." />
        {openCount > 0 ? (
          <div className="mb-5 space-y-2">
            <p className="text-sm">{openCount} of {totalCount} {totalCount === 1 ? "task is" : "tasks are"} not done. What should happen to {openCount === 1 ? "it" : "them"}?</p>
            <Label htmlFor="move-open-tasks">Move unfinished tasks to</Label>
            <Select id="move-open-tasks" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="BACKLOG">Backlog (no sprint)</option>
              {targets.map((s) => <option key={s.id} value={s.id}>{s.name}{s.status === "ACTIVE" ? " (active)" : " (planned)"}</option>)}
              <option value="">Leave in this sprint</option>
            </Select>
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
          <Button loading={pending} onClick={confirm}>Complete sprint</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
