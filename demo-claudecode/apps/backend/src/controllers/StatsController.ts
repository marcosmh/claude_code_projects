import type { StatsService } from "../services/StatsService";
import { ok } from "../utils/http";
import { monthlyQuerySchema, summaryQuerySchema } from "../validators/invoice.validator";
import { parseQuery } from "./requestParsers";

export class StatsController {
  constructor(private readonly stats: StatsService) {}

  async summary(ownerId: number, request: Request): Promise<Response> {
    const { currency } = parseQuery(summaryQuerySchema, request);
    return ok(await this.stats.summary(ownerId, currency), currency ? { currency } : undefined);
  }

  async monthly(ownerId: number, request: Request): Promise<Response> {
    const { months, currency } = parseQuery(monthlyQuerySchema, request);
    return ok(await this.stats.monthly(ownerId, months, currency), { months, ...(currency ? { currency } : {}) });
  }
}
