import { STATUS_COLOR, STATUS_LABELS, STATUSES, type Status } from "@/lib/stats";

export function StatusBadge({ status, overdue = false }: { status: string; overdue?: boolean }) {
  const known = (STATUSES as readonly string[]).includes(status);
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{ background: known ? STATUS_COLOR[status as Status] : "var(--color-zinc-500)" }}
        />
        {known ? STATUS_LABELS[status as Status] : status}
      </span>
      {overdue && <span className="font-medium text-red-700">Vencida</span>}
    </span>
  );
}
