import type { StatsService } from "../services/StatsService";
import { ok } from "../utils/http";
import { monthlyQuerySchema } from "../validators/invoice.validator";
import { parseQuery } from "./requestParsers";

export class StatsController {
  constructor(private readonly stats: StatsService) {}

  async summary(): Promise<Response> {
    return ok(await this.stats.summary());
  }

  async monthly(request: Request): Promise<Response> {
    const { months } = parseQuery(monthlyQuerySchema, request);
    return ok(await this.stats.monthly(months), { months });
  }
}
