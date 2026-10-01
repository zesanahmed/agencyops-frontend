"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Copy, MailPlus, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { RoleBadge } from "@/components/shared/role-badge";
import { Can, useOrg } from "@/features/organizations/org-context";
import { qk } from "@/features/organizations/hooks";
import { useUrlState } from "@/hooks/use-url-state";
import { invitationApi, memberApi } from "@/lib/api/services";
import { formatDate } from "@/lib/format";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/rbac";
import { useAction } from "@/lib/use-action";
import { useAuthStore } from "@/stores/auth-store";
import type { Invitation, Membership, Role } from "@/types/domain";

const ROLES: Role[] = ["OWNER", "MANAGER", "TEAM_MEMBER"];
const inviteSchema = z.object({ email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"), role: z.enum(["OWNER", "MANAGER", "TEAM_MEMBER"]) });
type InviteValues = z.infer<typeof inviteSchema>;

export function MembersView() {
  const { can } = useOrg();
  return (
    <Tabs defaultValue="members">
      <TabsList aria-label="People sections">
        <TabsTrigger value="members">Members</TabsTrigger>
        {can("member.invite") ? <TabsTrigger value="invitations">Invitations</TabsTrigger> : null}
      </TabsList>
      <TabsContent value="members"><MemberList /></TabsContent>
      {can("member.invite") ? <TabsContent value="invitations"><InvitationList /></TabsContent> : null}
    </Tabs>
  );
}

function MemberList() {
  const { organizationId: o } = useOrg();
  const me = useAuthStore((s) => s.user);
  const { page } = useUrlState();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.members(o, { page }), queryFn: () => memberApi.list(o, { page, limit: 20 }), placeholderData: (p) => p });
  const inv = [["organizations", o, "members"]];
  const role = useAction({ fn: (v: { id: string; role: Role }) => memberApi.updateRole(o, v.id, v.role), invalidate: inv, success: "Role updated" });
  const remove = useAction({ fn: (id: string) => memberApi.remove(o, id), invalidate: inv, success: "Member removed" });
  const [removing, setRemoving] = useState<Membership | null>(null);

  if (isLoading) return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load members" />;
  if (!data?.items.length) return <EmptyState icon={UsersRound} title="No members found" />;

  return (
    <>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {data.items.map((m) => {
          const isMe = Boolean(me && (m.userId === me.id || m.email === me.email));
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1 basis-48">
                <p className="truncate text-sm font-medium">{m.name}{isMe ? <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span> : null}</p>
                <p className="truncate text-xs text-muted-foreground">{m.email}</p>
              </div>
              <Can permission="member.updateRole" fallback={<RoleBadge role={m.role} />}>
                <Select aria-label={`Role for ${m.name}`} value={m.role} disabled={isMe || role.isPending} onChange={(e) => role.mutate({ id: m.id, role: e.target.value as Role })} className="w-auto min-w-36">
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </Select>
              </Can>
              <Can permission="member.remove"><Button variant="ghost" size="icon" disabled={isMe} aria-label={`Remove ${m.name}`} onClick={() => setRemoving(m)}><Trash2 /></Button></Can>
            </li>
          );
        })}
      </ul>
      <Pagination meta={data.meta} />
      <ConfirmDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)} title="Remove member?" description={`${removing?.name} will lose access to this organization.`} confirmLabel="Remove" destructive onConfirm={() => remove.mutateAsync(removing!.id)} />
    </>
  );
}

function InvitationList() {
  const { organizationId: o } = useOrg();
  const { page } = useUrlState();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.invitations(o, { page }), queryFn: () => invitationApi.list(o, { page, limit: 20 }), placeholderData: (p) => p });
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<Invitation | null>(null);
  const inv = [["organizations", o, "invitations"]];
  const create = useAction({ fn: (v: InviteValues) => invitationApi.create(o, v), invalidate: inv });
  const revoke = useAction({ fn: (id: string) => invitationApi.revoke(o, id), invalidate: inv, success: "Invitation revoked" });
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { role: "TEAM_MEMBER" } });
  const chosenRole = useWatch({ control, name: "role" });
  const link = (t: string) => `${window.location.origin}/invite/${t}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setOpen(true)}><MailPlus /> Invite someone</Button></div>
      {isLoading ? <Skeleton className="h-32" /> : isError ? <ErrorState error={error} onRetry={() => refetch()} title="Couldn't load invitations" /> : !data?.items.length ? (
        <EmptyState icon={MailPlus} title="No pending invitations" description="Invite teammates by email and choose their role." />
      ) : (<>
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {data.items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 basis-48"><p className="truncate text-sm font-medium">{i.email}</p><p className="text-xs text-muted-foreground">{i.status ? `${i.status.toLowerCase()} · ` : ""}expires {formatDate(i.expiresAt)}</p></div>
              <RoleBadge role={i.role} />
              <Button variant="ghost" size="icon" aria-label={`Revoke invitation for ${i.email}`} onClick={() => revoke.mutate(i.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
        <Pagination meta={data.meta} />
      </>)}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setIssued(null); } }}>
        <DialogContent>
          {issued ? (
            <>
              <DialogHeader title="Invitation created" description="Email delivery isn't set up yet — share this link with the invitee yourself. It works once and expires." />
              <div className="flex gap-2">
                <Input readOnly aria-label="Invitation link" value={issued.inviteToken ? link(issued.inviteToken) : "Link unavailable — the server did not return a token."} onFocus={(e) => e.currentTarget.select()} />
                <Button variant="secondary" disabled={!issued.inviteToken} onClick={() => { navigator.clipboard.writeText(link(issued.inviteToken!)).then(() => toast.success("Link copied"), () => toast.error("Couldn't copy — select and copy it manually.")); }}><Copy /> Copy</Button>
              </div>
              <div className="mt-5 flex justify-end"><Button onClick={() => setOpen(false)}>Done</Button></div>
            </>
          ) : (
            <>
              <DialogHeader title="Invite someone" description="They'll join this organization with the role you pick." />
              <form noValidate className="space-y-4" onSubmit={handleSubmit(async (v) => { const r = await create.mutateAsync(v).catch(() => null); if (r) setIssued(r); })}>
                <div className="space-y-1.5"><Label htmlFor="inv-email">Email</Label><Input id="inv-email" type="email" autoFocus aria-invalid={!!errors.email} {...register("email")} />{errors.email ? <p className="text-xs text-danger">{errors.email.message}</p> : null}</div>
                <div className="space-y-1.5"><Label htmlFor="inv-role">Role</Label>
                  <Select id="inv-role" {...register("role")}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</Select>
                  <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTION[chosenRole]}</p></div>
                <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Create invitation</Button></div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
