"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, UserPlus, UsersRound, X } from "lucide-react";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Can, useOrg } from "@/features/organizations/org-context";
import { qk } from "@/features/organizations/hooks";
import { useAllMembers } from "@/features/tasks/hooks";
import { useUrlState } from "@/hooks/use-url-state";
import { teamApi } from "@/lib/api/services";
import { useAction } from "@/lib/use-action";
import type { Team } from "@/types/domain";

const teamSchema = z.object({ name: z.string().trim().min(2, "Name must be at least 2 characters").max(80), description: z.string().trim().max(500, "Description is too long").optional() });
type TeamValues = z.infer<typeof teamSchema>;

export function TeamsView() {
  const { organizationId: o } = useOrg();
  const { get, page } = useUrlState();
  const search = get("search");
  const selected = get("team");
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.teams(o, { page, search }), queryFn: () => teamApi.list(o, { page, limit: 12, search }), placeholderData: (p) => p });
  const [creating, setCreating] = useState(false);
  const create = useAction({ fn: (v: TeamValues) => teamApi.create(o, { name: v.name, description: v.description || undefined }), invalidate: [["organizations", o, "teams"]], success: "Team created" });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TeamValues>({ resolver: zodResolver(teamSchema) });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search teams…" label="Search teams" />
        <div className="sm:ml-auto"><Can permission="team.manage"><Button onClick={() => setCreating(true)}><Plus /> New team</Button></Can></div>
      </div>
      {isLoading ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load teams" />
        : !data?.items.length ? <EmptyState icon={UsersRound} title={search ? "No teams match" : "No teams yet"} description={search ? "Try a different search." : "Teams group people who work together, then get assigned to projects."} action={!search ? <Can permission="team.manage"><Button onClick={() => setCreating(true)}><Plus /> Create a team</Button></Can> : undefined} />
        : (<>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.items.map((t) => (
              <li key={t.id}>
                <TeamCard team={t} selected={selected === t.id} />
              </li>
            ))}
          </ul>
          <Pagination meta={data.meta} />
        </>)}
      <Dialog open={creating} onOpenChange={(v) => { setCreating(v); if (!v) reset(); }}>
        <DialogContent>
          <DialogHeader title="New team" description="Give the team a name and what it owns." />
          <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => { const ok = await create.mutateAsync(v).then(() => true, () => false); if (ok) { setCreating(false); reset(); } })}>
            <div className="space-y-1.5"><Label htmlFor="team-name">Name</Label><Input id="team-name" placeholder="Backend team" autoFocus aria-invalid={!!errors.name} {...register("name")} />{errors.name ? <p className="text-xs text-danger">{errors.name.message}</p> : null}</div>
            <div className="space-y-1.5"><Label htmlFor="team-desc">Description <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="team-desc" className="min-h-16" {...register("description")} />{errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}</div>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create team</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamCard({ team, selected }: { team: Team; selected: boolean }) {
  const { organizationId: o } = useOrg();
  const [open, setOpen] = useState(selected);
  const [deleting, setDeleting] = useState(false);
  const key = ["organizations", o, "teams", team.id, "members"];
  const members = useQuery({ queryKey: key, queryFn: () => teamApi.members(o, team.id), enabled: open });
  const all = useAllMembers(o);
  const add = useAction({ fn: (m: string) => teamApi.addMember(o, team.id, m), invalidate: [key], success: "Member added" });
  const remove = useAction({ fn: (id: string) => teamApi.removeMember(o, team.id, id), invalidate: [key], success: "Member removed" });
  const del = useAction({ fn: () => teamApi.remove(o, team.id), invalidate: [["organizations", o, "teams"]], success: "Team deleted" });
  const taken = new Set(members.data?.map((m) => m.membershipId));

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 p-4">
        <button className="min-w-0 flex-1 text-left" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <h3 className="truncate font-medium">{team.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{team.description || "No description."}</p>
          <p className="mt-2 text-xs text-muted-foreground">{open ? "Hide members" : "Show members"}</p>
        </button>
        <Can permission="team.manage"><Button variant="ghost" size="icon" aria-label={`Delete ${team.name}`} onClick={() => setDeleting(true)}><Trash2 /></Button></Can>
      </div>
      {open ? (
        <div className="space-y-3 border-t border-border p-4">
          {members.isLoading ? <Skeleton className="h-16" /> : members.isError ? <ErrorState error={members.error} onRetry={() => members.refetch()} title="Couldn't load members" /> : members.data?.length ? (
            <ul className="space-y-2">
              {members.data.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm"><Avatar name={m.name} size="sm" /><span className="flex-1 truncate">{m.name}</span>
                  <Can permission="team.manage"><button className="rounded-sm p-1 text-muted-foreground hover:bg-surface-muted" aria-label={`Remove ${m.name}`} onClick={() => remove.mutate(m.id)}><X className="size-3.5" /></button></Can></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No members yet.</p>}
          <Can permission="team.manage">
            <div className="flex gap-2">
              <Select aria-label={`Add member to ${team.name}`} value="" disabled={add.isPending} onChange={(e) => e.target.value && add.mutate(e.target.value)}>
                <option value="">Add a member…</option>
                {all.data?.items.filter((m) => !taken.has(m.id)).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
              <UserPlus className="hidden" aria-hidden />
            </div>
          </Can>
        </div>
      ) : null}
      <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete team?" description={`“${team.name}” will be removed. Projects it was assigned to keep their other members.`} confirmLabel="Delete team" destructive onConfirm={() => del.mutateAsync(undefined)} />
    </div>
  );
}
