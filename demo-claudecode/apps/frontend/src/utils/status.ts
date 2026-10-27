import { isInvoiceStatus } from "@invoices/shared-types";
import type { Status } from "@/types/invoice";

export { STATUSES } from "@/types/invoice";
export { STATUS_LABELS } from "@invoices/shared-types";

/** El color sigue a la entidad (estado): mismo color en badges y gráficos. */
export const STATUS_COLOR: Record<Status, string> = {
  DRAFT: "var(--series-1)",
  SENT: "var(--series-2)",
  PAID: "var(--series-3)",
};

export const isStatus = (value: string | null | undefined): value is Status => value != null && isInvoiceStatus(value);
