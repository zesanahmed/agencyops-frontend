"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck, MailX, Loader2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";
import { authApi } from "@/lib/api/services";
import { ApiError, toErrorMessage } from "@/lib/api/errors";
import { useAuth } from "./auth-provider";

type State = { kind: "working" } | { kind: "done" } | { kind: "failed"; message: string };

/**
 * The e-mailed link (/verify-email?token=…) is single-use. The request fires exactly once per page load: React's dev
 * double-invoke or a re-render must not spend the token twice and turn a success into "invalid link".
 */
export function VerifyEmailView() {
  const token = useSearchParams().get("token")?.trim() ?? "";
  const { status, refreshUser } = useAuth();
  const started = useRef(false);
  const [state, setState] = useState<State>(token ? { kind: "working" } : { kind: "failed", message: "This page needs the link from your verification e-mail." });

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi.verifyEmail(token)
      .then(async () => { await refreshUser(); setState({ kind: "done" }); })
      .catch((e: unknown) => setState({ kind: "failed", message: e instanceof ApiError && e.status === 400 ? "This verification link is invalid or has expired." : toErrorMessage(e) }));
  }, [token, refreshUser]);

  if (state.kind === "working")
    return <StatusPage icon={Loader2} tone="neutral" title="Verifying your e-mail…"><span role="status">One moment.</span></StatusPage>;
  if (state.kind === "done")
    return (
      <StatusPage icon={MailCheck} tone="success" title="E-mail verified" actions={<Link href={status === "authenticated" ? "/organizations" : "/login"} className={buttonVariants()}>{status === "authenticated" ? "Continue to AgencyOps" : "Sign in"}</Link>}>
        Thanks. Your address is confirmed.
      </StatusPage>
    );
  return (
    <StatusPage icon={MailX} tone="danger" title="We couldn't verify that link"
      actions={<Link href={status === "authenticated" ? "/profile" : "/login"} className={buttonVariants({ variant: "secondary" })}>{status === "authenticated" ? "Go to your profile" : "Sign in"}</Link>}>
      <span role="alert">{state.message}</span>{" "}
      {status === "authenticated" ? "You can request a new link from your profile." : "Sign in to request a new link from your profile."}
    </StatusPage>
  );
}
