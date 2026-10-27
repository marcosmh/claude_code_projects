import type { Status } from "@/types/invoice";
import { STATUS_COLOR, STATUS_LABELS } from "@/utils/status";

export function StatusBadge({ status, overdue = false }: { status: Status; overdue?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
        {STATUS_LABELS[status]}
      </span>
      {overdue && <span className="font-medium text-red-700">Vencida</span>}
    </span>
  );
}
