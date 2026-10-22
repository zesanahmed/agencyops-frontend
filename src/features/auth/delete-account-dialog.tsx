"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/services";
import { ApiError, toErrorMessage } from "@/lib/api/errors";
import { useAuth } from "./auth-provider";
import { DELETE_CONFIRMATION, deleteAccountSchema, type DeleteAccountValues } from "./schemas";

/**
 * Deleting the account is permanent. The backend refuses (409) while the user still owns an organization and asks for the
 * password when the account has one; both messages are shown as-is. Accounts that only use Google/GitHub have no password.
 */
export function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { logout } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DeleteAccountValues>({ resolver: zodResolver(deleteAccountSchema), defaultValues: { password: "", confirmation: "" } });

  const close = (v: boolean) => { if (isSubmitting) return; if (!v) { reset(); setServerError(null); } onOpenChange(v); };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader title="Delete your account?" description="This permanently removes your account and signs you out everywhere. It can't be undone." />
        <form noValidate className="space-y-4" onSubmit={handleSubmit(async ({ password }) => {
          setServerError(null);
          try {
            await authApi.deleteAccount(password?.trim() ? password : undefined);
            toast.success("Your account was deleted.");
            await logout().catch(() => undefined);
          } catch (e) {
            // 409 (still owns an organization) and 400 (password) carry actionable server messages; keep the dialog open.
            const m = toErrorMessage(e);
            setServerError(e instanceof ApiError || e instanceof TypeError ? m : "Something went wrong. Please try again.");
          }
        })}>
          <div className="space-y-1.5">
            <Label htmlFor="del-password">Password</Label>
            <Input id="del-password" type="password" autoComplete="current-password" aria-describedby="del-password-hint" {...register("password")} />
            <p id="del-password-hint" className="text-xs text-muted-foreground">Leave blank if you only sign in with Google or GitHub.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="del-confirm">Type {DELETE_CONFIRMATION} to confirm</Label>
            <Input id="del-confirm" autoComplete="off" aria-invalid={!!errors.confirmation} aria-describedby={errors.confirmation ? "del-confirm-error" : undefined} {...register("confirmation")} />
            {errors.confirmation ? <p id="del-confirm-error" className="text-xs text-danger">{errors.confirmation.message}</p> : null}
          </div>
          {serverError ? <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{serverError}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => close(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="danger" loading={isSubmitting}>Delete account</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
