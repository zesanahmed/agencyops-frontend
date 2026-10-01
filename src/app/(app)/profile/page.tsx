import type { Metadata } from "next";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { ProfileView } from "@/features/auth/profile-view";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6"><Logo href="/organizations" /><UserMenu /></header>
      <main id="main" className="mx-auto max-w-2xl px-4 py-10 sm:px-6"><ProfileView /></main>
    </div>
  );
}
