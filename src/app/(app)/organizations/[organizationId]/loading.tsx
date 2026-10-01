import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-4" role="status" aria-label="Loading project"><Skeleton className="h-10 w-72" /><Skeleton className="h-10 w-full" /><Skeleton className="h-64" /></div>;
}
