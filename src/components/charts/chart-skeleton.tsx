import { Skeleton } from "@/components/ui/skeleton";

export function ChartSkeleton({ height }: { height: number }) {
  return (
    <div style={{ height }} className="relative w-full overflow-hidden rounded-lg" aria-hidden>
      <Skeleton className="absolute inset-0" />
    </div>
  );
}
