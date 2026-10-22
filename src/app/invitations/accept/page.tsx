import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Accept invitation", robots: { index: false } };

/**
 * The backend e-mails invitation links as /invitations/accept?token=…; the app's invitation page is /invite/[token].
 * This bridges the two so those e-mails land somewhere real.
 */
export default async function InvitationLinkPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const value = Array.isArray(token) ? token[0] : token;
  redirect(value?.trim() ? `/invite/${encodeURIComponent(value.trim())}` : "/login");
}
