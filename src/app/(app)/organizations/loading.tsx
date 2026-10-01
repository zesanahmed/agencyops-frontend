import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-10" role="status" aria-label="Loading organizations">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );
}
