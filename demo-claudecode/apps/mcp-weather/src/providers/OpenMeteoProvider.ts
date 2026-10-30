import { z } from "zod";
import { CityNotFoundError, WeatherUnavailableError, type GeoLocation, type WeatherReport } from "../domain/types.js";
import type { WeatherProvider } from "../services/WeatherProvider.js";

// Open-Meteo: free for non-commercial use, no API key. https://open-meteo.com/en/docs
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_TIMEOUT_MS = 5000;
/** The geocoder has no country filter, so ask for several matches and filter here. */
const GEOCODING_CANDIDATES = 10;

const geocodingSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        timezone: z.string(),
        country: z.string().optional(),
        country_code: z.string().optional(),
        admin1: z.string().optional(),
        population: z.number().optional(),
      }),
    )
    .optional(),
});

const nullableNumber = z.number().nullable();

const forecastSchema = z.object({
  utc_offset_seconds: z.number(),
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    precipitation: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    wind_gusts_10m: z.number(),
    is_day: z.number(),
  }),
  daily: z.object({
    temperature_2m_max: z.array(nullableNumber),
    temperature_2m_min: z.array(nullableNumber),
    precipitation_probability_max: z.array(nullableNumber),
    uv_index_max: z.array(nullableNumber),
  }),
});

/** A response that does not match what we expect is a service problem, not a crash. */
function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new WeatherUnavailableError("El servicio del clima devolvió una respuesta inesperada");
  return parsed.data;
}

export class OpenMeteoProvider implements WeatherProvider {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async geocode(city: string, countryCode?: string): Promise<GeoLocation> {
    const url = new URL(GEOCODING_URL);
    url.search = new URLSearchParams({
      name: city,
      count: String(GEOCODING_CANDIDATES),
      language: "es",
      format: "json",
    }).toString();
    const { results = [] } = parseResponse(geocodingSchema, await this.getJson(url));
    // Same-name places come in arbitrary order (a hamlet can precede the city): the most populated one wins. The sort
    // is stable, so places without a population keep the API's order.
    const candidates = countryCode ? results.filter((r) => r.country_code?.toUpperCase() === countryCode.toUpperCase()) : results;
    const match = [...candidates].sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];
    if (!match) throw new CityNotFoundError(countryCode ? `${city} (${countryCode})` : city);
    return {
      name: match.name,
      country: match.country ?? match.country_code ?? "",
      countryCode: match.country_code,
      region: match.admin1,
      latitude: match.latitude,
      longitude: match.longitude,
      timezone: match.timezone,
    };
  }

  async forecast(location: GeoLocation): Promise<WeatherReport> {
    const url = new URL(FORECAST_URL);
    url.search = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max",
      timezone: "auto",
      forecast_days: "1",
    }).toString();
    const data = parseResponse(forecastSchema, await this.getJson(url));
    const { current, daily } = data;
    return {
      location,
      localTime: current.time,
      utcOffsetSeconds: data.utc_offset_seconds,
      isDay: current.is_day === 1,
      temperatureC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidityPercent: current.relative_humidity_2m,
      precipitationMm: current.precipitation,
      windKmh: current.wind_speed_10m,
      windGustsKmh: current.wind_gusts_10m,
      weatherCode: current.weather_code,
      todayMinC: daily.temperature_2m_min[0] ?? current.temperature_2m,
      todayMaxC: daily.temperature_2m_max[0] ?? current.temperature_2m,
      precipitationProbability: daily.precipitation_probability_max[0] ?? 0,
      uvIndexMax: daily.uv_index_max[0] ?? 0,
    };
  }

  /** GET + JSON with a timeout. Any network, HTTP or shape problem becomes a `WeatherUnavailableError`. */
  private async getJson(url: URL): Promise<unknown> {
    try {
      const response = await this.fetchImpl(url, { signal: AbortSignal.timeout(this.timeoutMs), headers: { Accept: "application/json" } });
      if (!response.ok) throw new WeatherUnavailableError(`El servicio del clima respondió ${response.status}`);
      return await response.json();
    } catch (error) {
      if (error instanceof WeatherUnavailableError) throw error;
      throw new WeatherUnavailableError();
    }
  }
}
