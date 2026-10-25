import { calcTotals, isOverdue, STATUSES } from "../domain/invoice";
import type {
  MonthBucketResponse,
  StatsSummaryResponse,
  StatusBucket,
} from "../dto/invoice.dto";
import type { InvoiceRepository } from "../repositories/InvoiceRepository";
import type { InvoiceStatus } from "../types";

const monthKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export class StatsService {
  constructor(
    private readonly repository: InvoiceRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async summary(): Promise<StatsSummaryResponse> {
    const { data: invoices } = await this.repository.findAll();
    const now = this.now();
    const byStatus = Object.fromEntries(
      STATUSES.map((s) => [s, { count: 0, totalCents: 0 }]),
    ) as Record<InvoiceStatus, StatusBucket>;
    const overdue: StatusBucket = { count: 0, totalCents: 0 };

    for (const invoice of invoices) {
      const { totalCents } = calcTotals(invoice.items, invoice.taxRate);
      const bucket = byStatus[invoice.status];
      bucket.count += 1;
      bucket.totalCents += totalCents;
      if (isOverdue(invoice, now)) {
        overdue.count += 1;
        overdue.totalCents += totalCents;
      }
    }
    return { byStatus, overdue, totalCount: invoices.length };
  }

  /** Totals per issue month and status for the last `months` months (current month included). */
  async monthly(months: number): Promise<MonthBucketResponse[]> {
    const { data: invoices } = await this.repository.findAll();
    const now = this.now();
    const short = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
    const long = new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    const buckets: MonthBucketResponse[] = Array.from({ length: months }, (_, i) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
      return {
        key: monthKey(d),
        label: short.format(d).replace(".", ""),
        title: long.format(d),
        totalsCents: { DRAFT: 0, SENT: 0, PAID: 0 },
      };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));

    for (const invoice of invoices) {
      const bucket = byKey.get(monthKey(invoice.issueDate));
      if (bucket) {
        bucket.totalsCents[invoice.status] += calcTotals(invoice.items, invoice.taxRate).totalCents;
      }
    }
    return buckets;
  }
}
