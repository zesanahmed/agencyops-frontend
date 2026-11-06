import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-2" role="status" aria-label="Loading invoices"><Skeleton className="h-10 w-48" />{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div>;
}
