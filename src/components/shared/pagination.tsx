"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUrlState } from "@/hooks/use-url-state";
import type { PageMeta } from "@/lib/api/pagination";

/** URL-driven pagination: writes `?page=` so views are bookmarkable. */
export function Pagination({ meta }: { meta: PageMeta }) {
  const { set } = useUrlState();
  if (meta.totalPages <= 1) return null;
  const from = (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.page * meta.limit, meta.total);
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4 text-sm">
      <p className="text-muted-foreground" aria-live="polite">
        {from}–{to} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => set({ page: meta.page - 1 })} aria-label="Previous page">
          <ChevronLeft /> Prev
        </Button>
        <span className="tabular-nums text-muted-foreground">Page {meta.page} / {meta.totalPages}</span>
        <Button variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => set({ page: meta.page + 1 })} aria-label="Next page">
          Next <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
