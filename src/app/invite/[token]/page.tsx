import type { Metadata } from "next";
import { Logo } from "@/components/shared/logo";
import { InviteView } from "@/features/invitations/invite-view";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
      <Logo />
      <InviteView token={token} />
    </main>
  );
}
