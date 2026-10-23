import { Router } from "express";
import { EnvHttpProxyAgent, fetch as proxyFetch } from "undici";

export interface Place {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  country: string;
}
interface ToolsOptions {
  fetchImpl?: (
    url: string,
    init?: { headers?: Record<string, string>; signal?: AbortSignal },
  ) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;
  geocodeIntervalMs?: number;
}
class ToolsError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const stringValue = (value: unknown) =>
  typeof value === "string" ? value : "";
const numberValue = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const validCoordinate = (value: unknown, limit: number): number | null => {
  if (typeof value !== "string" || !value.trim()) return null;
  const result = Number(value);
  return Number.isFinite(result) && Math.abs(result) <= limit ? result : null;
};
function queryText(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.trim().length < 2 ||
    value.trim().length > 120 ||
    /[\x00-\x1F]/.test(value)
  ) {
    throw new ToolsError(
      "Enter a city or place name between 2 and 120 characters.",
      400,
    );
  }
  return value.trim();
}
function cacheSet<T>(
  cache: Map<string, { expires: number; value: T }>,
  key: string,
  value: T,
  duration: number,
) {
  if (cache.size >= 300) cache.delete(cache.keys().next().value!);
  cache.set(key, { value, expires: Date.now() + duration });
}

/** Public data services use fixed provider destinations, never a URL supplied by a browser. */
export function createToolsRouter(options: ToolsOptions = {}) {
  const router = Router();
  const agent = options.fetchImpl ? undefined : new EnvHttpProxyAgent();
  const fetchImpl =
    options.fetchImpl ??
    ((url, init) => proxyFetch(url, { ...init, dispatcher: agent }));
  const placeCache = new Map<string, { expires: number; value: Place[] }>();
  const weatherCache = new Map<string, { expires: number; value: unknown }>();
  let lastGeocodeAt = 0;
  let geocodeQueue: Promise<unknown> = Promise.resolve();
  let queued = 0;
  const geocodeInterval = options.geocodeIntervalMs ?? 1100;
  const placeInflight = new Map<string, Promise<Place[]>>();
  async function getJson(url: URL) {
    try {
      const response = await fetchImpl(url.toString(), {
        headers: {
          "User-Agent":
            "PokeTubeGlass/1.0 (independent development UI; https://github.com/kaifshaikh78611000-crypto/poketubeclone)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        if (response.status === 403)
          throw new ToolsError(
            "The data provider is blocked or denied access. Check the environment network settings.",
          );
        if (response.status === 429)
          throw new ToolsError(
            "The data provider is busy. Please wait a moment and try again.",
            429,
          );
        throw new ToolsError(
          `The data provider returned HTTP ${response.status}. Please try again later.`,
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof ToolsError) throw error;
      throw new ToolsError(
        "The data provider could not be reached. Check your connection or environment network settings and try again.",
      );
    }
  }
  async function geocode(query: string): Promise<Place[]> {
    const key = query.toLocaleLowerCase("en-US");
    const cached = placeCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    const inflight = placeInflight.get(key);
    if (inflight) return inflight;
    if (queued >= 5)
      throw new ToolsError(
        "Several place searches are already waiting. Please try again in a few seconds.",
        429,
      );
    queued++;
    const task = geocodeQueue
      .then(async () => {
        const wait = geocodeInterval - (Date.now() - lastGeocodeAt);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        lastGeocodeAt = Date.now();
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.search = new URLSearchParams({
          format: "json",
          limit: "1",
          addressdetails: "1",
          q: query,
        }).toString();
        const data = await getJson(url);
        if (!Array.isArray(data))
          throw new ToolsError(
            "The location provider returned an unexpected response.",
          );
        const places = data.flatMap((entry): Place[] => {
          if (!isRecord(entry)) return [];
          const lat = validCoordinate(entry.lat, 90);
          const lon = validCoordinate(entry.lon, 180);
          if (lat === null || lon === null) return [];
          const address = isRecord(entry.address) ? entry.address : {};
          const displayName = stringValue(entry.display_name);
          return [
            {
              name:
                stringValue(entry.name) || displayName.split(",")[0] || query,
              displayName,
              lat,
              lon,
              country: stringValue(address.country),
            },
          ];
        });
        cacheSet(placeCache, key, places, 24 * 60 * 60_000);
        return places;
      })
      .finally(() => {
        queued--;
        placeInflight.delete(key);
      });
    geocodeQueue = task.catch(() => {});
    placeInflight.set(key, task);
    return task;
  }
  const handleError = (
    error: unknown,
    response: import("express").Response,
  ) => {
    const failure =
      error instanceof ToolsError
        ? error
        : new ToolsError(
            "This tool is temporarily unavailable. Please try again.",
          );
    response
      .status(failure.status)
      .set("Cache-Control", "no-store")
      .json({ error: failure.message });
  };
  router.get("/places", async (req, res) => {
    try {
      const query = queryText(req.query.q);
      const places = await geocode(query);
      res.json({ places, attribution: "© OpenStreetMap contributors" });
    } catch (error) {
      handleError(error, res);
    }
  });
  router.get("/weather", async (req, res) => {
    try {
      const units = req.query.units ?? "metric";
      if (units !== "metric" && units !== "imperial")
        throw new ToolsError("Units must be metric or imperial.", 400);
      let location: Place;
      if (req.query.lat !== undefined || req.query.lon !== undefined) {
        const lat = validCoordinate(req.query.lat, 90);
        const lon = validCoordinate(req.query.lon, 180);
        if (lat === null || lon === null)
          throw new ToolsError(
            "Enter valid latitude and longitude coordinates.",
            400,
          );
        const name =
          typeof req.query.name === "string"
            ? req.query.name.slice(0, 120)
            : "Selected location";
        location = { name, displayName: name, lat, lon, country: "" };
      } else {
        const query = queryText(req.query.q);
        const places = await geocode(query);
        if (!places.length)
          throw new ToolsError(
            "No matching place was found. Try adding the country or region.",
            404,
          );
        location = places[0];
      }
      const key = `${location.lat.toFixed(4)},${location.lon.toFixed(4)}:${units}`;
      const cached = weatherCache.get(key);
      if (cached && cached.expires > Date.now()) {
        res.json({ ...(cached.value as object), location });
        return;
      }
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({
        latitude: String(location.lat),
        longitude: String(location.lon),
        current:
          "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
        timezone: "auto",
        forecast_days: "7",
        temperature_unit: units === "imperial" ? "fahrenheit" : "celsius",
        wind_speed_unit: units === "imperial" ? "mph" : "kmh",
      }).toString();
      const raw = await getJson(url);
      if (!isRecord(raw) || !isRecord(raw.current) || !isRecord(raw.daily))
        throw new ToolsError(
          "The weather provider returned an unexpected response.",
        );
      const current = raw.current;
      const temperature = numberValue(current.temperature_2m);
      if (temperature === null || numberValue(current.weather_code) === null)
        throw new ToolsError(
          "Current weather data is not available for this location.",
        );
      const daily = raw.daily;
      const days = Array.isArray(daily.time) ? daily.time : [];
      const at = (key: string, i: number) =>
        Array.isArray(daily[key]) ? (daily[key] as unknown[])[i] : null;
      const result = {
        location,
        units: {
          temperature: units === "imperial" ? "°F" : "°C",
          windSpeed: units === "imperial" ? "mph" : "km/h",
        },
        current: {
          temperature,
          feelsLike: numberValue(current.apparent_temperature),
          humidity: numberValue(current.relative_humidity_2m),
          windSpeed: numberValue(current.wind_speed_10m),
          precipitation: numberValue(current.precipitation),
          isDay: current.is_day === 1,
          weatherCode: current.weather_code,
          time: stringValue(current.time),
        },
        daily: days
          .slice(0, 7)
          .map((day, i) => ({
            date: stringValue(day),
            weatherCode: numberValue(at("weather_code", i)),
            min: numberValue(at("temperature_2m_min", i)),
            max: numberValue(at("temperature_2m_max", i)),
            sunrise: stringValue(at("sunrise", i)),
            sunset: stringValue(at("sunset", i)),
          })),
        attribution: "Weather data by Open-Meteo",
      };
      cacheSet(weatherCache, key, result, 10 * 60_000);
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  });
  return router;
}
