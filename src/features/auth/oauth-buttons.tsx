import { env } from "@/config/env";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PROVIDERS = { google: "Google", github: "GitHub" } as const;

/** lucide-react ships no brand logos, so a plain letter badge stands in and keeps the icon set consistent. */
function Mark({ letter }: { letter: string }) {
  return <span aria-hidden className="flex size-4 items-center justify-center rounded-full border border-border-strong text-[10px] font-semibold leading-none">{letter}</span>;
}

/**
 * Full-page navigation to the backend's OAuth start URL. It goes through the same `/api/v1` proxy as every other request
 * so the state cookie, the provider callback and the refresh cookie all stay first-party; the backend's API_PUBLIC_URL must
 * therefore be this site's origin. Renders nothing unless NEXT_PUBLIC_OAUTH_PROVIDERS lists a provider.
 */
export function OAuthButtons({ verb }: { verb: "Sign in" | "Sign up" }) {
  if (!env.oauthProviders.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="text-xs uppercase tracking-wider text-muted-foreground">or</span><span className="h-px flex-1 bg-border" /></div>
      <div className="grid gap-2 sm:grid-cols-2">
        {env.oauthProviders.map((id) => (
          // A plain anchor on purpose: this is a server redirect chain, not a client-side route.
          <a key={id} href={`${env.apiBaseUrl}/auth/oauth/${id}`} className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>
            <Mark letter={id === "github" ? "H" : "G"} />
            {verb} with {PROVIDERS[id]}
          </a>
        ))}
      </div>
    </div>
  );
}
