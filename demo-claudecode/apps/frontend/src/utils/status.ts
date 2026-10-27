import type { Status } from "@/types/invoice";

export { STATUSES } from "@/types/invoice";

/** Etiquetas de presentación; los valores válidos los define el contrato del backend. */
export const STATUS_LABELS: Record<Status, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  PAID: "Pagada",
};

/** El color sigue a la entidad (estado): mismo color en badges y gráficos. */
export const STATUS_COLOR: Record<Status, string> = {
  DRAFT: "var(--series-1)",
  SENT: "var(--series-2)",
  PAID: "var(--series-3)",
};

export const isStatus = (value: string | null | undefined): value is Status =>
  value === "DRAFT" || value === "SENT" || value === "PAID";
