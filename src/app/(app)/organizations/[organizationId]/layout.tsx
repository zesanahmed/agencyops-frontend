import { OrgShell } from "@/components/layout/org-shell";

export default async function OrganizationLayout({ children, params }: { children: React.ReactNode; params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  return <OrgShell organizationId={organizationId}>{children}</OrgShell>;
}
