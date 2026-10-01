import type { Metadata } from "next";
import { Logo } from "@/components/shared/logo";
import { PageHeader } from "@/components/shared/page-header";
import { UserMenu } from "@/components/layout/user-menu";
import { OrganizationList } from "@/features/organizations/organization-list";
import { CreateOrganizationDialog } from "@/features/organizations/create-organization-dialog";

export const metadata: Metadata = { title: "Organizations" };

export default function OrganizationsPage() {
  return (
    <div className="min-h-dvh">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
        <Logo href="/organizations" />
        <UserMenu />
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <PageHeader title="Your organizations" description="Choose a workspace to continue. Roles are per organization." actions={<CreateOrganizationDialog />} />
        <OrganizationList />
      </main>
    </div>
  );
}
