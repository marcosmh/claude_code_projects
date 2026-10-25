import type { ReactNode } from "react";

export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
      {children}
    </div>
  );
}
