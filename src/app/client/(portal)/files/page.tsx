import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PendingFeature } from "@/components/client/pending-feature";

export const metadata: Metadata = { title: "Files · Client portal", robots: { index: false } };

export default function Page() {
  return <PendingFeature icon={FileText} title="Files" description="Documents exchanged on your projects." summary="Uploads and downloads for each shared project will appear here once file storage is released." plans={["Upload with progress and preview","Only files shared with you are visible"]} />;
}
