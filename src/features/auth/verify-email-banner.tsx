"use client";

import { useState } from "react";
import { MailWarning } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/services";
import { toErrorMessage } from "@/lib/api/errors";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Soft reminder for an unverified address. The backend does not block anything on it, so this nudges rather than gates.
 * Shown only when the server says the address is unverified (never for a partial user payload that omits the field).
 */
export function VerifyEmailBanner() {
  const user = useAuthStore((s) => s.user);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  if (!user || user.emailVerifiedAt !== null) return null;

  async function resend() {
    setPending(true);
    try {
      const didSend = await authApi.resendVerification();
      if (didSend) { setSent(true); toast.success("Verification e-mail sent."); }
      else { toast.info("Your address is already verified."); const me = await authApi.me(); useAuthStore.setState({ user: me }); }
    } catch (e) { toast.error(toErrorMessage(e)); } finally { setPending(false); }
  }

  return (
    <div role="region" aria-label="Verify your e-mail" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-warning-soft px-4 py-2 text-sm text-warning sm:px-6">
      <MailWarning className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">Verify <strong className="font-medium">{user.email}</strong> to keep your account recoverable.</span>
      {sent ? <span className="text-xs">Check your inbox.</span> : <Button variant="link" size="sm" loading={pending} onClick={resend} className="text-warning">Resend e-mail</Button>}
    </div>
  );
}
