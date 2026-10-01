"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPage } from "@/components/shared/status-page";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error.digest ?? "route error"); }, [error]);
  return (
    <StatusPage icon={TriangleAlert} tone="danger" title="Something went wrong" actions={<Button onClick={reset}>Try again</Button>}>
      <p>An unexpected error interrupted this page. Your data is safe — try again, and if it keeps happening, reload.</p>
    </StatusPage>
  );
}
