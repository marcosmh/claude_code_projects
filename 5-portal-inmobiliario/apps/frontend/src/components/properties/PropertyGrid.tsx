import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type PropertyGridProps = {
  children: ReactNode;
  className?: string;
};

/** Grid responsive: 1 columna en móvil, 2 en tablet y 3 en escritorio. */
export function PropertyGrid({
  children,
  className,
  ...rest
}: PropertyGridProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)} {...rest}>
      {children}
    </div>
  );
}
