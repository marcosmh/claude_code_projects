import type { GeoLocation, WeatherReport } from "../src/domain/types.js";
import type { WeatherProvider } from "../src/services/WeatherProvider.js";

export const oaxaca: GeoLocation = {
  name: "Oaxaca",
  country: "México",
  countryCode: "MX",
  region: "Estado de Oaxaca",
  latitude: 17.06,
  longitude: -96.72,
  timezone: "America/Mexico_City",
};

/** A mild, dry, calm day; tests override what they care about. */
export const report = (over: Partial<WeatherReport> = {}): WeatherReport => ({
  location: oaxaca,
  localTime: "2026-10-29T15:00",
  utcOffsetSeconds: -21600,
  isDay: true,
  temperatureC: 23,
  feelsLikeC: 23,
  humidityPercent: 50,
  precipitationMm: 0,
  windKmh: 8,
  windGustsKmh: 12,
  weatherCode: 1,
  todayMinC: 18,
  todayMaxC: 25,
  precipitationProbability: 5,
  uvIndexMax: 2,
  ...over,
});

export class FakeProvider implements WeatherProvider {
  geocodeCalls = 0;
  forecastCalls = 0;
  constructor(private readonly weather: WeatherReport = report()) {}
  async geocode() {
    this.geocodeCalls++;
    return this.weather.location;
  }
  async forecast() {
    this.forecastCalls++;
    return this.weather;
  }
}
