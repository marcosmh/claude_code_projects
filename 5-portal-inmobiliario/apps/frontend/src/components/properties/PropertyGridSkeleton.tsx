import { Skeleton } from "@/components/ui/Skeleton";
import { PropertyGrid } from "./PropertyGrid";

// JSX estático hoisteado: no se vuelve a crear en cada render.
const skeletonCard = (
  <div className="space-y-3">
    <Skeleton className="aspect-[3/2] w-full" />
    <Skeleton className="h-6 w-1/2" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

type PropertyGridSkeletonProps = {
  count: number;
  label: string;
  className?: string;
};

/** Marcador de carga con la forma de PropertyGrid; compartido por landing y catálogo. */
export function PropertyGridSkeleton({ count, label, className }: PropertyGridSkeletonProps) {
  return (
    <PropertyGrid className={className} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>{skeletonCard}</div>
      ))}
    </PropertyGrid>
  );
}
