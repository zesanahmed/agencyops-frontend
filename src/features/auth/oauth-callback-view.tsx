"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";
import { useAuth } from "./auth-provider";

/** Fixed codes from the backend's OAuthErrorCode; anything else is treated as a generic failure. */
export const OAUTH_ERRORS: Record<string, string> = {
  access_denied: "You cancelled the sign-in at the provider.",
  invalid_state: "That sign-in attempt expired or didn't start here. Please try again.",
  email_not_verified: "Your provider account has no verified e-mail address, so we can't sign you in with it.",
  account_disabled: "This account has been disabled.",
  oauth_failed: "We couldn't complete the sign-in. Please try again.",
};
export const oauthErrorMessage = (code: string): string => OAUTH_ERRORS[code] ?? OAUTH_ERRORS.oauth_failed;

/**
 * Landing page of the provider round-trip (backend redirects to /oauth/callback?provider=… or ?error=…). On success the
 * refresh cookie is already set; this trades it for an access token exactly once (the refresh token rotates on use).
 */
export function OAuthCallbackView() {
  const params = useSearchParams();
  const error = params.get("error");
  const router = useRouter();
  const { completeOAuth } = useAuth();
  const started = useRef(false);
  const [failed, setFailed] = useState<string | null>(error ? oauthErrorMessage(error) : null);

  useEffect(() => {
    if (error || started.current) return;
    started.current = true;
    completeOAuth().then((ok) => { if (ok) router.replace("/organizations"); else setFailed(oauthErrorMessage("oauth_failed")); });
  }, [error, completeOAuth, router]);

  if (failed)
    return (
      <StatusPage icon={ShieldAlert} tone="danger" title="Sign-in didn't complete" actions={<Link href="/login" className={buttonVariants()}>Back to sign in</Link>}>
        <span role="alert">{failed}</span>
      </StatusPage>
    );
  return <StatusPage icon={Loader2} tone="neutral" title="Signing you in…"><span role="status">One moment.</span></StatusPage>;
}
