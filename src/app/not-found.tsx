import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";

export default function NotFound() {
  return (
    <StatusPage icon={Compass} tone="neutral" title="Page not found" actions={<><Button asChild><Link href="/">Go home</Link></Button><Button asChild variant="secondary"><Link href="/organizations">Your workspaces</Link></Button></>}>
      <p>That page doesn&apos;t exist, or you don&apos;t have access to it.</p>
    </StatusPage>
  );
}
