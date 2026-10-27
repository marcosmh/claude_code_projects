import { useId, type ReactNode } from "react";

export const inputClass = "w-full rounded-md border border-zinc-300 bg-surface px-3 py-2 text-sm placeholder:text-zinc-500/70 hover:border-zinc-500 focus-visible:border-brand aria-invalid:border-red-500";

/** Etiqueta asociada a su control mediante `htmlFor`/`id`, con su mensaje de error. */
export function Field({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": error ? errorId : undefined })}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
