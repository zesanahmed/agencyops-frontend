import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-4" role="status" aria-label="Loading task"><Skeleton className="h-10 w-80" /><Skeleton className="h-40" /><Skeleton className="h-48" /></div>;
}
