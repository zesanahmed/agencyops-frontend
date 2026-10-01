import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { PendingFeature } from "@/components/client/pending-feature";

export const metadata: Metadata = { title: "Projects · Client portal", robots: { index: false } };

export default function Page() {
  return <PendingFeature icon={FolderKanban} title="Projects" description="The projects your agency has shared with you." summary="Shared projects will list here with their current status and progress, once the client portal is released." plans={["Status and progress only — internal tasks and discussion stay private"]} />;
}
