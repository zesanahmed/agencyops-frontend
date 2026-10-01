import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <div className="mx-auto max-w-2xl space-y-4 px-4 py-10" role="status" aria-label="Loading profile"><Skeleton className="h-8 w-40" /><Skeleton className="h-20" /></div>;
}
