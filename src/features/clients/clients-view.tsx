"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ExternalLink, Plus } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Can, useOrg } from "@/features/organizations/org-context";
import { useUrlState } from "@/hooks/use-url-state";
import { formatDate } from "@/lib/format";
import { useClients } from "./hooks";
import { ClientFormDialog } from "./client-form-dialog";

const PAGE_SIZE = 12;
const SORTS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "name:asc", label: "Name A–Z" },
  { value: "name:desc", label: "Name Z–A" },
] as const;

/** Clients of the agency. Search, sort and page live in the URL (?search=&sort=&page=). */
export function ClientsView() {
  const { organizationId: o } = useOrg();
  const router = useRouter();
  const { get, set, page } = useUrlState();
  const search = get("search");
  const sort = SORTS.some((s) => s.value === get("sort")) ? get("sort") : SORTS[0].value;
  const [sortBy, sortOrder] = sort.split(":") as ["createdAt" | "name", "asc" | "desc"];
  const [creating, setCreating] = useState(false);
  const q = useClients(o, { page, limit: PAGE_SIZE, ...(search ? { search } : {}), sortBy, sortOrder });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput placeholder="Search clients…" label="Search clients" />
        <Select aria-label="Sort clients" value={sort} onChange={(e) => set({ sort: e.target.value === SORTS[0].value ? "" : e.target.value })} className="sm:w-44">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <div className="sm:ml-auto"><Can permission="client:create"><Button onClick={() => setCreating(true)}><Plus /> New client</Button></Can></div>
      </div>

      {q.isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading clients">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        : q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} title="Couldn't load clients" />
        : !q.data?.items.length ? (
          <EmptyState icon={Building2} title={search ? "No clients match" : "No clients yet"}
            description={search ? "Try a different search." : "Clients are the companies you build for. Add one to invite their team to the portal and send invoices."}
            action={!search ? <Can permission="client:create"><Button onClick={() => setCreating(true)}><Plus /> Add your first client</Button></Can> : undefined} />
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {q.data.items.map((c) => (
                <li key={c.id}>
                  <Link href={`/organizations/${o}/clients/${c.id}`} className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                    <h3 className="font-medium leading-snug">{c.name}</h3>
                    {c.website ? <p className="flex items-center gap-1 truncate text-sm text-muted-foreground"><ExternalLink className="size-3.5 shrink-0" aria-hidden /><span className="truncate">{c.website.replace(/^https?:\/\//, "")}</span></p> : <p className="text-sm text-muted-foreground">No website</p>}
                    <p className="mt-auto pt-2 text-xs text-muted-foreground">Added {formatDate(c.createdAt)}</p>
                  </Link>
                </li>
              ))}
            </ul>
            <Pagination meta={q.data.meta} />
          </>
        )}

      <ClientFormDialog mode="create" open={creating} onOpenChange={setCreating} onSaved={(c) => router.push(`/organizations/${o}/clients/${c.id}`)} />
    </div>
  );
}
