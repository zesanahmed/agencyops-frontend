import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-3" role="status" aria-label="Loading files"><Skeleton className="h-10 w-48" /><Skeleton className="h-9 w-64" /><Skeleton className="h-32" /></div>;
}
