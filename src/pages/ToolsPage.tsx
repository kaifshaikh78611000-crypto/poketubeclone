import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Compass,
  Droplets,
  ExternalLink,
  Languages,
  LoaderCircle,
  Map,
  MapPin,
  Moon,
  Navigation,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Sunrise,
  Sunset,
  Trash2,
  Upload,
  Users,
  Wind,
  X,
} from "lucide-react";
import "./tools.css";

type Place = {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
  country: string;
};
type Weather = {
  location: Place;
  units: { temperature: string; windSpeed: string };
  current: {
    temperature: number;
    feelsLike: number | null;
    humidity: number | null;
    windSpeed: number | null;
    precipitation: number | null;
    isDay: boolean;
    weatherCode: number;
    time: string;
  };
  daily: {
    date: string;
    weatherCode: number | null;
    min: number | null;
    max: number | null;
    sunrise: string;
    sunset: string;
  }[];
};
const weatherDescription = (code: number | null) => {
  if (code === 0) return "Clear sky";
  if (code !== null && code <= 3)
    return ["Clear sky", "Mainly clear", "Partly cloudy", "Overcast"][code];
  if (code === 45 || code === 48) return "Foggy";
  if (code !== null && code >= 51 && code <= 57) return "Light drizzle";
  if (code !== null && code >= 61 && code <= 67) return "Rain";
  if (code !== null && code >= 71 && code <= 77) return "Snow";
  if (code !== null && code >= 80 && code <= 82) return "Rain showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code !== null && code >= 95) return "Thunderstorms";
  return "Weather conditions";
};
function WeatherIcon({
  code,
  night = false,
  size = 30,
}: {
  code: number | null;
  night?: boolean;
  size?: number;
}) {
  if (code === 0 || code === 1)
    return night ? <Moon size={size} /> : <Sun size={size} />;
  if (code !== null && code >= 95) return <CloudLightning size={size} />;
  if (
    code !== null &&
    ((code >= 71 && code <= 77) || code === 85 || code === 86)
  )
    return <CloudSnow size={size} />;
  if (code !== null && code >= 61) return <CloudRain size={size} />;
  if (code !== null && code >= 51) return <CloudDrizzle size={size} />;
  return <Cloud size={size} />;
}
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string"
        ? data.error
        : "The request could not be completed. Please try again.",
    );
  return data as T;
}
const displayNumber = (number: number | null) =>
  number === null ? "—" : Math.round(number);
const displayTime = (iso: string) =>
  iso ? iso.split("T")[1]?.slice(0, 5) || "—" : "—";
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateFromIso = (iso: string) => new Date(`${iso}T12:00:00`);

function ToolHeading({
  label,
  title,
  description,
  icon: Icon,
}: {
  label: string;
  title: string;
  description: string;
  icon: typeof Sun;
}) {
  return (
    <header className="page-heading tool-heading">
      <Link to="/tools" className="tool-back">
        <ArrowLeft size={13} /> All tools
      </Link>
      <span className="eyebrow">
        <Icon size={12} /> {label}
      </span>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
function ToolsHub() {
  return (
    <div className="page-enter tools-page">
      <header className="page-heading">
        <span className="eyebrow">
          <Compass size={12} /> A LITTLE MORE POKE
        </span>
        <h1>Beyond the play button.</h1>
        <p>
          A few thoughtful tools for your everyday. One quiet place to find
          them.
        </p>
      </header>
      <div className="tools-hub-grid">
        <Link to="/weather" className="glass tool-tile tool-tile-weather">
          <span className="tool-tile-icon">
            <Sun size={34} />
          </span>
          <span className="eyebrow">A LOOK OUTSIDE</span>
          <h2>Weather</h2>
          <p>
            Real conditions and a seven-day forecast, wherever the day takes
            you.
          </p>
          <span className="tool-tile-link">
            Check the forecast <ArrowRight size={15} />
          </span>
          <Cloud className="tool-tile-decoration" size={160} />
        </Link>
        <Link to="/map" className="glass tool-tile tool-tile-map">
          <span className="tool-tile-icon">
            <Map size={34} />
          </span>
          <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
          <h2>Maps</h2>
          <p>
            Find a place, explore the streets, and discover a different corner
            of the world.
          </p>
          <span className="tool-tile-link">
            Explore the map <ArrowRight size={15} />
          </span>
          <Navigation className="tool-tile-decoration" size={150} />
        </Link>
        <Link to="/calendar" className="glass tool-tile tool-tile-calendar">
          <span className="tool-tile-icon">
            <CalendarDays size={34} />
          </span>
          <span className="eyebrow">MAKE A LITTLE SPACE</span>
          <h2>Calendar</h2>
          <p>
            Keep your plans close. A simple personal calendar, saved on this
            device.
          </p>
          <span className="tool-tile-link">
            Plan your day <ArrowRight size={15} />
          </span>
          <CalendarDays className="tool-tile-decoration" size={150} />
        </Link>
        <Link to="/translate" className="glass tool-tile tool-tile-translate">
          <span className="tool-tile-icon">
            <Languages size={34} />
          </span>
          <span className="eyebrow">FIND THE RIGHT WORDS</span>
          <h2>Translate</h2>
          <p>
            A different language, a new connection. Translate a thought and keep
            your curiosity moving.
          </p>
          <span className="tool-tile-link">
            Start a conversation <ArrowRight size={15} />
          </span>
          <Languages className="tool-tile-decoration" size={150} />
        </Link>
      </div>
      <div className="tools-external-actions">
        <a
          href="https://www.youtube.com/upload"
          target="_blank"
          rel="noreferrer"
        >
          <Upload size={16} />
          <span>
            Upload on YouTube<small>Share something of your own.</small>
          </span>
          <ExternalLink size={13} />
        </a>
        <a href="https://social.poketube.fun" target="_blank" rel="noreferrer">
          <Users size={16} />
          <span>
            Poke Social<small>Find the community.</small>
          </span>
          <ExternalLink size={13} />
        </a>
      </div>
      <div className="tool-privacy-note">
        <ShieldCheck size={15} />
        <p>
          Weather and location searches contact their named providers only when
          you search. Your calendar stays in this browser.
        </p>
      </div>
    </div>
  );
}
function WeatherTool() {
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function search(city: string, nextUnits = units) {
    const clean = city.trim();
    if (clean.length < 2) {
      setError("Enter a city or place name with at least two characters.");
      return;
    }
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setQuery(clean);
    setLastQuery(clean);
    setLoading(true);
    setError("");
    try {
      const data = await getJson<Weather>(
        `/api/weather?${new URLSearchParams({ q: clean, units: nextUnits })}`,
        nextController.signal,
      );
      setWeather(data);
    } catch (failure) {
      if (!nextController.signal.aborted) {
        setWeather(null);
        setError(
          failure instanceof Error
            ? failure.message
            : "The forecast could not be loaded.",
        );
      }
    } finally {
      if (!nextController.signal.aborted) setLoading(false);
    }
  }
  function changeUnits(next: "metric" | "imperial") {
    setUnits(next);
    if (lastQuery) void search(lastQuery, next);
  }
  return (
    <div className="page-enter tools-page">
      <ToolHeading
        label="A LOOK OUTSIDE"
        title="A clearer picture of your day."
        description="Current conditions and the week ahead, powered by Open-Meteo."
        icon={Sun}
      />
      <div className="tool-search-row">
        <form
          className="tool-search glass"
          onSubmit={(event) => {
            event.preventDefault();
            void search(query);
          }}
        >
          <MapPin size={18} />
          <label className="tool-sr-only" htmlFor="weather-city">
            City or place
          </label>
          <input
            id="weather-city"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a city, e.g. Mumbai"
            minLength={2}
            maxLength={120}
            required
            autoComplete="off"
          />
          <button
            type="submit"
            className="button button-primary"
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle size={15} className="tool-spin" />
            ) : (
              <Search size={15} />
            )}
            <span>Search</span>
          </button>
        </form>
        <div className="tool-unit-toggle glass" aria-label="Temperature units">
          <button
            type="button"
            className={units === "metric" ? "active" : ""}
            onClick={() => changeUnits("metric")}
            aria-pressed={units === "metric"}
          >
            °C
          </button>
          <button
            type="button"
            className={units === "imperial" ? "active" : ""}
            onClick={() => changeUnits("imperial")}
            aria-pressed={units === "imperial"}
          >
            °F
          </button>
        </div>
      </div>
      {error && (
        <div className="tool-error" role="alert">
          <CloudRain size={18} />
          <div>
            <strong>We couldn’t load that forecast.</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
      {loading && (
        <div className="tool-loading glass" role="status">
          <LoaderCircle className="tool-spin" size={25} />
          <p>Finding your forecast…</p>
        </div>
      )}
      {!loading && !weather && !error && (
        <div className="weather-welcome glass">
          <div className="weather-welcome-sun">
            <Sun size={66} strokeWidth={1} />
          </div>
          <span className="eyebrow">GOOD DAYS START WITH A LITTLE CLARITY</span>
          <h2>What’s it like out there?</h2>
          <p>
            Choose a city to see its current weather and seven-day outlook.
            <br />
            We’ll never request your location automatically.
          </p>
          <div className="weather-city-examples">
            {["London", "Mumbai", "Tokyo"].map((city) => (
              <button
                className="button button-secondary"
                key={city}
                onClick={() => void search(city)}
              >
                <MapPin size={12} />
                {city}
              </button>
            ))}
          </div>
        </div>
      )}
      {!loading && weather && (
        <div aria-live="polite">
          <div className="weather-main-grid">
            <section
              className={`weather-now glass ${weather.current.isDay ? "" : "weather-night"}`}
            >
              <div className="weather-now-top">
                <div>
                  <span className="eyebrow">
                    <MapPin size={11} /> RIGHT NOW
                  </span>
                  <h2>{weather.location.name}</h2>
                  <p>
                    {weather.location.country || weather.location.displayName}
                  </p>
                </div>
                <span className="weather-main-icon">
                  <WeatherIcon
                    code={weather.current.weatherCode}
                    night={!weather.current.isDay}
                    size={82}
                  />
                </span>
              </div>
              <div className="weather-temperature">
                {displayNumber(weather.current.temperature)}
                <span>{weather.units.temperature}</span>
              </div>
              <h3>{weatherDescription(weather.current.weatherCode)}</h3>
              <p className="weather-feels">
                Feels like {displayNumber(weather.current.feelsLike)}
                {weather.units.temperature}
                <span> · </span>As of {displayTime(weather.current.time)} local
                time
              </p>
            </section>
            <section className="glass weather-details">
              <span className="eyebrow">THE LITTLE DETAILS</span>
              <div className="weather-detail-grid">
                <div>
                  <Droplets size={20} />
                  <span>Humidity</span>
                  <strong>
                    {displayNumber(weather.current.humidity)}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <Wind size={20} />
                  <span>Wind</span>
                  <strong>
                    {displayNumber(weather.current.windSpeed)}
                    <small>{weather.units.windSpeed}</small>
                  </strong>
                </div>
                <div>
                  <Sunrise size={20} />
                  <span>Sunrise</span>
                  <strong>
                    {displayTime(weather.daily[0]?.sunrise || "")}
                  </strong>
                </div>
                <div>
                  <Sunset size={20} />
                  <span>Sunset</span>
                  <strong>{displayTime(weather.daily[0]?.sunset || "")}</strong>
                </div>
              </div>
            </section>
          </div>
          <section className="weather-week">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A LITTLE FURTHER AHEAD</span>
                <h2>Your week, at a glance.</h2>
              </div>
              <span className="muted">7-day forecast</span>
            </div>
            <div className="weather-day-grid">
              {weather.daily.map((day, index) => (
                <article
                  key={day.date}
                  className={`glass weather-day ${index === 0 ? "weather-day-today" : ""}`}
                >
                  <strong>
                    {index === 0
                      ? "Today"
                      : dateFromIso(day.date).toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                  </strong>
                  <span className="weather-day-date">
                    {dateFromIso(day.date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="weather-day-icon">
                    <WeatherIcon code={day.weatherCode} />
                  </span>
                  <p>
                    {displayNumber(day.max)}°{" "}
                    <span>{displayNumber(day.min)}°</span>
                  </p>
                  <small>{weatherDescription(day.weatherCode)}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
      <p className="tool-provider">
        Weather by{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
          Open-Meteo <ExternalLink size={10} />
        </a>{" "}
        · Locations by{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors
        </a>
        . Searches are sent only when you submit.
      </p>
    </div>
  );
}
function MapTool() {
  const [query, setQuery] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapEnabled, setMapEnabled] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function search(event: FormEvent) {
    event.preventDefault();
    controller.current?.abort();
    const next = new AbortController();
    controller.current = next;
    setLoading(true);
    setError("");
    try {
      const data = await getJson<{ places: Place[] }>(
        `/api/places?${new URLSearchParams({ q: query.trim() })}`,
        next.signal,
      );
      if (!data.places.length)
        setError(
          "No matching place was found. Try adding the country or region.",
        );
      else setPlace(data.places[0]);
    } catch (failure) {
      if (!next.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "This place could not be found.",
        );
    } finally {
      if (!next.signal.aborted) setLoading(false);
    }
  }
  const lat = place?.lat ?? 20;
  const lon = place?.lon ?? 0;
  const span = place ? 0.035 : 120;
  const bbox = `${Math.max(-180, lon - span)},${Math.max(-85, lat - span * 0.7)},${Math.min(180, lon + span)},${Math.min(85, lat + span * 0.7)}`;
  const embed = `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({ bbox, layer: "mapnik", ...(place ? { marker: `${lat},${lon}` } : {}) })}`;
  return (
    <div className="page-enter tools-page">
      <ToolHeading
        label="FOLLOW YOUR CURIOSITY"
        title="Somewhere worth discovering."
        description="A quieter way to find your place in the world. Powered by OpenStreetMap."
        icon={Map}
      />
      <form className="tool-search glass" onSubmit={search}>
        <Search size={18} />
        <label className="tool-sr-only" htmlFor="map-search">
          Search for a place
        </label>
        <input
          id="map-search"
          placeholder="Search a place, city, or address"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
          minLength={2}
          maxLength={120}
          required
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle className="tool-spin" size={15} />
          ) : (
            <Navigation size={15} />
          )}
          <span>Find a place</span>
        </button>
      </form>
      {error && (
        <div role="alert" className="tool-error">
          <MapPin size={18} />
          <p>{error}</p>
        </div>
      )}
      {place && (
        <div className="map-location glass" aria-live="polite">
          <span className="map-location-icon">
            <MapPin size={21} />
          </span>
          <div>
            <h2>{place.name}</h2>
            <p>{place.displayName}</p>
            <small>
              {place.lat.toFixed(4)}°, {place.lon.toFixed(4)}°
            </small>
          </div>
          <a
            className="button button-secondary"
            href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=15/${place.lat}/${place.lon}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in OSM <ExternalLink size={13} />
          </a>
        </div>
      )}
      <section className="map-canvas glass">
        {mapEnabled ? (
          <>
            <iframe
              key={embed}
              title={
                place
                  ? `Interactive map of ${place.name}`
                  : "Interactive world map"
              }
              src={embed}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="map-disable-wrap">
              <button
                className="button button-secondary"
                onClick={() => setMapEnabled(false)}
              >
                <X size={12} /> Unload map
              </button>
            </div>
          </>
        ) : (
          <div className="map-consent">
            <span className="map-contour map-contour-one" />
            <span className="map-contour map-contour-two" />
            <span className="map-contour map-contour-three" />
            <span className="map-consent-icon">
              <Map size={40} strokeWidth={1.3} />
            </span>
            <span className="eyebrow">THE WORLD IS A LITTLE CLOSER</span>
            <h2>
              {place ? `Explore ${place.name}.` : "A new perspective awaits."}
            </h2>
            <p>
              Load the interactive map to explore with OpenStreetMap.
              <br />
              This connects to OpenStreetMap and its map tile providers.
            </p>
            <button
              className="button button-primary"
              onClick={() => setMapEnabled(true)}
            >
              <Map size={15} />
              Load interactive map
            </button>
          </div>
        )}
      </section>
      {mapEnabled && (
        <p className="map-access-note">
          If the map is blank, its provider may be blocked by your network
          settings.{" "}
          {place && (
            <a
              href={`https://www.openstreetmap.org/#map=15/${place.lat}/${place.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              Open this location in OpenStreetMap <ExternalLink size={11} />
            </a>
          )}
        </p>
      )}
      <p className="tool-provider">
        Map data ©{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          OpenStreetMap contributors <ExternalLink size={10} />
        </a>
        . Place search uses Nominatim; no searches run while you type.
      </p>
    </div>
  );
}

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  notes: string;
  color: string;
};
const EVENT_KEY = "poketube-glass:calendar-events:v1";
const EVENT_COLORS = ["sage", "blue", "rose"];
function loadEvents(): { events: CalendarEvent[]; error: string } {
  try {
    const stored = localStorage.getItem(EVENT_KEY);
    if (!stored) return { events: [], error: "" };
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length > 200)
      throw new Error("Invalid calendar storage");
    const events = parsed.filter((entry): entry is CalendarEvent => {
      if (!entry || typeof entry !== "object") return false;
      const event = entry as Record<string, unknown>;
      return (
        typeof event.id === "string" &&
        event.id.length < 100 &&
        typeof event.title === "string" &&
        event.title.length > 0 &&
        event.title.length <= 100 &&
        typeof event.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
        !Number.isNaN(dateFromIso(event.date).getTime()) &&
        localDate(dateFromIso(event.date)) === event.date &&
        typeof event.time === "string" &&
        (event.time === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)) &&
        typeof event.notes === "string" &&
        event.notes.length <= 500 &&
        typeof event.color === "string" &&
        EVENT_COLORS.includes(event.color)
      );
    });
    return {
      events,
      error:
        events.length === parsed.length
          ? ""
          : "Some saved events could not be read. Valid events are still available.",
    };
  } catch {
    return {
      events: [],
      error:
        "Your saved calendar could not be read. This browser may block local storage.",
    };
  }
}
function CalendarTool() {
  const [today] = useState(() => new Date());
  const todayIso = localDate(today);
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selected, setSelected] = useState(todayIso);
  const [initial] = useState(loadEvents);
  const [events, setEvents] = useState<CalendarEvent[]>(initial.events);
  const [error, setError] = useState(initial.error);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [color, setColor] = useState("sage");
  const [notice, setNotice] = useState("");
  const days: Date[] = [];
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  for (let i = 0; i < 42; i++)
    days.push(new Date(month.getFullYear(), month.getMonth(), i - offset + 1));
  const selectedEvents = events
    .filter((event) => event.date === selected)
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = events
    .filter((event) => event.date >= todayIso)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 5);
  function save(next: CalendarEvent[]) {
    try {
      localStorage.setItem(EVENT_KEY, JSON.stringify(next));
      setEvents(next);
      setError("");
      return true;
    } catch {
      setError(
        "This browser could not save your calendar. Free some local storage or enable storage for this site.",
      );
      return false;
    }
  }
  function add(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    if (events.length >= 200) {
      setError(
        "Your calendar holds up to 200 events. Remove an old event to add another.",
      );
      return;
    }
    const id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    if (
      save([
        ...events,
        {
          id,
          title: title.trim(),
          date: selected,
          time,
          notes: notes.trim(),
          color,
        },
      ])
    ) {
      setTitle("");
      setTime("");
      setNotes("");
      setNotice("Event saved on this device.");
    }
  }
  function selectDay(date: Date) {
    setSelected(localDate(date));
    setNotice("");
    if (date.getMonth() !== month.getMonth())
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }
  function goToday() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelected(todayIso);
    setNotice("");
  }
  return (
    <div className="page-enter tools-page">
      <ToolHeading
        label="MAKE A LITTLE SPACE"
        title="Good things are worth planning."
        description="Your personal calendar. No account, no sync — just a little room for what matters."
        icon={CalendarDays}
      />
      {error && (
        <div className="tool-error" role="alert">
          <CalendarDays size={18} />
          <p>{error}</p>
        </div>
      )}
      <div className="calendar-layout">
        <section className="calendar-card glass">
          <header className="calendar-toolbar">
            <div>
              <span className="eyebrow">YOUR DAYS, YOUR WAY</span>
              <h2>
                {month.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
            </div>
            <div>
              <button className="calendar-today" onClick={goToday}>
                Today
              </button>
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </header>
          <div className="calendar-weekdays">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div
            className="calendar-days"
            role="group"
            aria-label={month.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          >
            {days.map((day) => {
              const iso = localDate(day);
              const dayEvents = events.filter((event) => event.date === iso);
              return (
                <button
                  key={iso}
                  className={`calendar-day ${day.getMonth() !== month.getMonth() ? "other-month" : ""} ${iso === todayIso ? "is-today" : ""} ${iso === selected ? "selected" : ""}`}
                  aria-label={`${day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`}
                  aria-pressed={iso === selected}
                  onClick={() => selectDay(day)}
                >
                  <span className="calendar-date-number">{day.getDate()}</span>
                  <span className="calendar-cell-events">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className={`calendar-cell-event event-${event.color}`}
                      >
                        <i />
                        {event.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <small>+{dayEvents.length - 2} more</small>
                    )}
                  </span>
                  <span className="calendar-mobile-dots">
                    {dayEvents.slice(0, 3).map((event) => (
                      <i key={event.id} className={`event-${event.color}`} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i className="calendar-legend-today" /> Today
            </span>
            <span>
              <i className="event-sage" /> Personal
            </span>
            <span>
              <i className="event-blue" /> Work
            </span>
            <span>
              <i className="event-rose" /> Something special
            </span>
          </div>
        </section>
        <aside className="calendar-agenda">
          <section className="glass calendar-agenda-card">
            <span className="eyebrow">A LITTLE MOMENT FOR</span>
            <h2>
              {dateFromIso(selected).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <div className="calendar-day-agenda">
              {selectedEvents.length ? (
                selectedEvents.map((event) => (
                  <article
                    key={event.id}
                    className={`calendar-agenda-event event-${event.color}`}
                  >
                    <i />
                    <div>
                      <strong>{event.title}</strong>
                      <span>{event.time || "All day"}</span>
                      {event.notes && <p>{event.notes}</p>}
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Delete ${event.title}`}
                      onClick={() => {
                        if (save(events.filter((item) => item.id !== event.id)))
                          setNotice("Event removed.");
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </article>
                ))
              ) : (
                <div className="calendar-no-events">
                  <CalendarDays size={24} strokeWidth={1.3} />
                  <p>
                    A little space to make your own.
                    <br />
                    Add something to look forward to.
                  </p>
                </div>
              )}
            </div>
            <form className="calendar-event-form" onSubmit={add}>
              <h3>
                <Plus size={14} /> Add an event
              </h3>
              <label htmlFor="event-title">What’s the plan?</label>
              <input
                id="event-title"
                placeholder="Something worth making time for"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={100}
                required
              />
              <div className="calendar-time-row">
                <div>
                  <label htmlFor="event-date">Date</label>
                  <input
                    id="event-date"
                    type="date"
                    value={selected}
                    min="1900-01-01"
                    max="2200-12-31"
                    onChange={(event) => {
                      if (event.target.value) {
                        setSelected(event.target.value);
                        setMonth(
                          new Date(
                            dateFromIso(event.target.value).getFullYear(),
                            dateFromIso(event.target.value).getMonth(),
                            1,
                          ),
                        );
                      }
                    }}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="event-time">
                    Time <span>(optional)</span>
                  </label>
                  <input
                    id="event-time"
                    type="time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </div>
              </div>
              <label htmlFor="event-notes">
                A little note <span>(optional)</span>
              </label>
              <textarea
                id="event-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Anything you’d like to remember…"
                maxLength={500}
              />
              <fieldset className="calendar-colors">
                <legend>Event color</legend>
                {EVENT_COLORS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`event-${item} ${color === item ? "chosen" : ""}`}
                    onClick={() => setColor(item)}
                    aria-label={`${item} event color`}
                    aria-pressed={color === item}
                  >
                    {color === item && <Check size={12} />}
                  </button>
                ))}
              </fieldset>
              <button className="button button-primary" type="submit">
                <Plus size={14} /> Save event
              </button>
            </form>
            <p className="calendar-save-notice" role="status">
              {notice}
            </p>
          </section>
        </aside>
      </div>
      {upcoming.length > 0 && (
        <section className="calendar-upcoming">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SOMETHING TO LOOK FORWARD TO</span>
              <h2>Coming up.</h2>
            </div>
          </div>
          <div className="calendar-upcoming-grid">
            {upcoming.map((event) => (
              <button
                key={event.id}
                className={`calendar-upcoming-event glass event-${event.color}`}
                onClick={() => {
                  const date = dateFromIso(event.date);
                  setSelected(event.date);
                  setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                }}
              >
                <span>
                  {dateFromIso(event.date).toLocaleDateString(undefined, {
                    month: "short",
                  })}
                  <strong>{dateFromIso(event.date).getDate()}</strong>
                </span>
                <div>
                  <strong>{event.title}</strong>
                  <small>{event.time || "All day"}</small>
                </div>
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </section>
      )}
      <p className="tool-provider">
        <ShieldCheck size={12} /> Your events are saved only in this browser.
        Clearing site data will remove them; they are not backed up or synced.
      </p>
    </div>
  );
}
export default function ToolsPage() {
  const { pathname } = useLocation();
  if (pathname === "/weather") return <WeatherTool />;
  if (pathname === "/map") return <MapTool />;
  if (pathname === "/calendar") return <CalendarTool />;
  return <ToolsHub />;
}
