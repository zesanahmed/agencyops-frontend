import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-3" role="status" aria-label="Loading invoices"><Skeleton className="h-9 w-72" />{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
}
