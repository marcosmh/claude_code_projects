import type { GeoLocation, WeatherReport } from "../domain/types.js";
import { TtlCache } from "./ttlCache.js";
import type { WeatherProvider } from "./WeatherProvider.js";

const GEOCODE_TTL_MS = 60 * 60_000;
const FORECAST_TTL_MS = 10 * 60_000;

export class WeatherService {
  private readonly locations: TtlCache<GeoLocation>;
  private readonly reports: TtlCache<WeatherReport>;

  constructor(
    private readonly provider: WeatherProvider,
    now: () => number = Date.now,
  ) {
    this.locations = new TtlCache(GEOCODE_TTL_MS, now);
    this.reports = new TtlCache(FORECAST_TTL_MS, now);
  }

  /** Current weather of a city (metric). Cached briefly so repeated questions do not hammer the free API. */
  async getReport(city: string, countryCode?: string): Promise<WeatherReport> {
    const country = countryCode?.toUpperCase();
    const location = await this.locations.getOrLoad(`${city.trim().toLowerCase()}|${country ?? ""}`, () =>
      this.provider.geocode(city.trim(), country),
    );
    return this.reports.getOrLoad(`${location.latitude},${location.longitude}`, () => this.provider.forecast(location));
  }
}
