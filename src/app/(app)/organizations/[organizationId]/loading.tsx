import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-3" role="status" aria-label="Loading"><Skeleton className="h-8 w-48" />{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
}
