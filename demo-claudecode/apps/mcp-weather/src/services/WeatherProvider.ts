import type { GeoLocation, WeatherReport } from "../domain/types.js";

/** Where weather data comes from. Swappable: the service and the tools only know this interface. */
export interface WeatherProvider {
  /** Resolves a city name (optionally restricted to an ISO 3166-1 alpha-2 country). Throws `CityNotFoundError`. */
  geocode(city: string, countryCode?: string): Promise<GeoLocation>;
  /** Current conditions plus today's outlook, in metric units. Throws `WeatherUnavailableError`. */
  forecast(location: GeoLocation): Promise<WeatherReport>;
}
