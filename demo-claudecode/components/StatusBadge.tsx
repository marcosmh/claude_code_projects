import { STATUS_COLOR, STATUS_LABELS, STATUSES, type Status } from "@/lib/stats";

export function StatusBadge({ status }: { status: string }) {
  const known = (STATUSES as readonly string[]).includes(status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ background: known ? STATUS_COLOR[status as Status] : "var(--color-zinc-500)" }}
      />
      {known ? STATUS_LABELS[status as Status] : status}
    </span>
  );
}
