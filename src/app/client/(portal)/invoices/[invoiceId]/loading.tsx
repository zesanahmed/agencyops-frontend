import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="space-y-4" role="status" aria-label="Loading invoice"><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /></div>;
}
