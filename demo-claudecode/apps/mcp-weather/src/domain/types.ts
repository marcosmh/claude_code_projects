export type Units = "metric" | "imperial";
export type Activity = "casual" | "trabajo" | "deporte" | "exterior";

export interface GeoLocation {
  name: string;
  country: string;
  countryCode?: string;
  region?: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

/** What the provider returns. Always metric (°C, km/h, mm): conversion for display happens at the edge. */
export interface WeatherReport {
  location: GeoLocation;
  /** Local wall-clock time of the city, `YYYY-MM-DDTHH:mm` (no offset). */
  localTime: string;
  utcOffsetSeconds: number;
  isDay: boolean;
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  precipitationMm: number;
  windKmh: number;
  windGustsKmh: number;
  weatherCode: number;
  todayMinC: number;
  todayMaxC: number;
  /** Highest chance of precipitation today, 0-100. */
  precipitationProbability: number;
  uvIndexMax: number;
}

export class CityNotFoundError extends Error {
  constructor(city: string) {
    super(`No se encontró la ciudad "${city}"`);
    this.name = "CityNotFoundError";
  }
}

/** The weather service could not be reached or answered something unusable. */
export class WeatherUnavailableError extends Error {
  constructor(message = "El servicio del clima no está disponible") {
    super(message);
    this.name = "WeatherUnavailableError";
  }
}
