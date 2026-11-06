"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Path the backend e-mails for client invitations (CLIENT_INVITE_PATH). */
export const PORTAL_INVITE_PATH = "/portal/accept-invite";
export const portalInviteUrl = (origin: string, token: string) => `${origin}${PORTAL_INVITE_PATH}?token=${encodeURIComponent(token)}`;

/**
 * The backend returns the one-time invite token only while e-mail delivery isn't configured (local/dev); in production the
 * contact gets it by e-mail and staff never see it. When it is returned, staff can hand the link over themselves.
 */
export function InviteLinkDialog({ token, contactName, onClose }: { token: string | null; contactName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;
  const url = portalInviteUrl(typeof window === "undefined" ? "" : window.location.origin, token);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader title={`Invitation for ${contactName}`} description="E-mail delivery isn't configured on the server, so the invitation link is shown here. It works once and expires." />
        <div className="space-y-1.5">
          <Label htmlFor="invite-link">Invitation link</Label>
          <div className="flex gap-2">
            <Input id="invite-link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* clipboard blocked: the field is selectable */ } }}>
              {copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
        <div className="mt-5 flex justify-end"><Button onClick={onClose}>Done</Button></div>
      </DialogContent>
    </Dialog>
  );
}
