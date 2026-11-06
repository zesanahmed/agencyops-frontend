"use client";

import { useState } from "react";
import { KeyRound, Mail, Pencil, Plus, UserRoundX, UserRoundCheck, Users } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Can, useOrg } from "@/features/organizations/org-context";
import { formatDate, timeAgo } from "@/lib/format";
import { toast } from "sonner";
import type { ClientContact, ContactInviteResult, ContactStatus } from "@/types/domain";
import { ContactAccessDialog } from "./contact-access-dialog";
import { ContactFormDialog } from "./contact-form-dialog";
import { useClientContacts, useDisableContact, useEnableContact, useReinviteContact } from "./hooks";
import { InviteLinkDialog } from "./invite-link-dialog";

const STATUS: Record<ContactStatus, { label: string; tone: BadgeTone }> = {
  INVITED: { label: "Invited", tone: "info" },
  ACTIVE: { label: "Active", tone: "success" },
  DISABLED: { label: "Disabled", tone: "neutral" },
};

export function ContactsPanel({ clientId }: { clientId: string }) {
  const { organizationId: o, can } = useOrg();
  const q = useClientContacts(o, clientId);
  const reinvite = useReinviteContact(o, clientId);
  const enable = useEnableContact(o, clientId);
  const disable = useDisableContact(o, clientId);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ClientContact | null>(null);
  const [disabling, setDisabling] = useState<ClientContact | null>(null);
  const [accessFor, setAccessFor] = useState<ClientContact | null>(null);
  const [invite, setInvite] = useState<{ token: string; name: string } | null>(null);

  /** Dev only: the token is returned when the server can't e-mail it. Otherwise the invitation went out by e-mail. */
  const handleInvite = (r: ContactInviteResult) => {
    if (r.inviteToken) setInvite({ token: r.inviteToken, name: r.contact.name });
    else toast.success(`Invitation e-mailed to ${r.contact.email}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">People at this client who can sign in to the portal.</p>
        <Can permission="client:create"><Button size="sm" onClick={() => setAdding(true)}><Plus /> Add contact</Button></Can>
      </div>

      {q.isLoading ? <div className="space-y-2" role="status" aria-label="Loading contacts">{[0, 1].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load contacts" />
        : !q.data?.length ? <EmptyState icon={Users} title="No contacts yet" description="Add the people who should see project progress and pay invoices. Each gets an e-mail invitation."
            action={<Can permission="client:create"><Button onClick={() => setAdding(true)}><Plus /> Add a contact</Button></Can>} />
        : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {q.data.map((c) => {
              const s = STATUS[c.status];
              return (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium"><span className="truncate">{c.name}</span><Badge tone={s.tone}>{s.label}</Badge></p>
                    <p className="truncate text-xs text-muted-foreground">{c.email}{c.jobTitle ? ` · ${c.jobTitle}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{c.lastLoginAt ? <>Last sign-in <time dateTime={c.lastLoginAt}>{timeAgo(c.lastLoginAt)}</time></> : `Added ${formatDate(c.createdAt)}, never signed in`}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => setAccessFor(c)} aria-label={`Portal access for ${c.name}`}><KeyRound /> Access</Button>
                    {can("client:update") ? (<>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil /></Button>
                      {c.status === "INVITED" ? <Button size="sm" variant="ghost" loading={reinvite.isPending && reinvite.variables === c.id} onClick={() => reinvite.mutate(c.id, { onSuccess: handleInvite })} aria-label={`Resend invitation to ${c.name}`}><Mail /> Resend</Button> : null}
                      {c.status === "DISABLED" ? <Button size="sm" variant="ghost" loading={enable.isPending && enable.variables === c.id} onClick={() => enable.mutate(c.id, { onSuccess: (r) => { toast.success(`${c.name} re-enabled`); if (r.inviteToken) handleInvite(r); } })} aria-label={`Enable ${c.name}`}><UserRoundCheck /> Enable</Button>
                        : <Button size="sm" variant="ghost" onClick={() => setDisabling(c)} aria-label={`Disable ${c.name}`}><UserRoundX /></Button>}
                    </>) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      <ContactFormDialog clientId={clientId} mode="create" open={adding} onOpenChange={setAdding} onInvited={handleInvite} />
      <ContactFormDialog clientId={clientId} mode="edit" contact={editing ?? undefined} open={!!editing} onOpenChange={(v) => !v && setEditing(null)} />
      <ContactAccessDialog clientId={clientId} contact={accessFor} canManage={can("client:manage-access")} onClose={() => setAccessFor(null)} />
      <InviteLinkDialog token={invite?.token ?? null} contactName={invite?.name ?? ""} onClose={() => setInvite(null)} />
      <ConfirmDialog open={!!disabling} onOpenChange={(v) => !v && setDisabling(null)} destructive confirmLabel="Disable contact"
        title={`Disable ${disabling?.name ?? "contact"}?`} description="They're signed out of the portal and can't sign in until you enable them again. Their project access is kept."
        onConfirm={() => disabling && disable.mutateAsync(disabling.id)} />
    </div>
  );
}
