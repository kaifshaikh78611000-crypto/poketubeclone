import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CircleHelp,
  Database,
  ExternalLink,
  Leaf,
  LoaderCircle,
  Monitor,
  Moon,
  Radio,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getStatus } from "../lib/api";
import { useLibrary, useToast } from "../lib/store";
import "./settings.css";

type Connection = Awaited<ReturnType<typeof getStatus>>;

export default function SettingsPage() {
  const library = useLibrary();
  const toast = useToast();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [checking, setChecking] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setConnectionError(false);
    getStatus(controller.signal)
      .then(setConnection)
      .catch((error) => {
        if (error.name !== "AbortError") setConnectionError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [refresh]);

  const exportLibrary = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      history: library.history,
      watchLater: library.watchLater,
      liked: library.liked,
      subscriptions: library.subscriptions,
      playlists: library.playlists,
      preferences: library.preferences,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `poketube-library-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Your library export is ready");
  };
  const live = connection?.mode === "live" && !connectionError;
  const savedVideoCount = new Set(
    [...library.watchLater, ...library.liked].map((video) => video.id),
  ).size;

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div className="eyebrow">
          <SlidersHorizontal size={12} /> MAKE YOURSELF AT HOME
        </div>
        <h1 className="page-heading">
          A little more you<span>.</span>
        </h1>
        <p className="muted">
          Your space, your pace. Fine-tune the way you watch.
        </p>
      </header>
      <div className="settings-layout">
        <div className="settings-main">
          <section
            className="settings-section glass"
            aria-labelledby="appearance-heading"
          >
            <header className="settings-section-heading">
              <span>
                <Sun size={18} />
              </span>
              <div>
                <h2 id="appearance-heading">Appearance</h2>
                <p>Set the mood for your next discovery.</p>
              </div>
            </header>
            <fieldset className="settings-theme-options">
              <legend className="settings-sr-only">Choose a color theme</legend>
              {(["dark", "light"] as const).map((theme) => (
                <label
                  key={theme}
                  className={`settings-theme-option ${library.preferences.theme === theme ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={library.preferences.theme === theme}
                    onChange={() => library.setPreference("theme", theme)}
                  />
                  <span
                    className={`settings-theme-preview settings-preview-${theme}`}
                    aria-hidden="true"
                  >
                    <span className="settings-preview-sidebar">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span className="settings-preview-content">
                      <i />
                      <span>
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  </span>
                  <span className="settings-theme-caption">
                    <span>
                      {theme === "dark" ? (
                        <Moon size={14} />
                      ) : (
                        <Sun size={14} />
                      )}
                      {theme === "dark" ? "After hours" : "Daylight"}
                      <small>{theme === "dark" ? "Dark" : "Light"}</small>
                    </span>
                    <span className="settings-radio-indicator">
                      {library.preferences.theme === theme && (
                        <Check size={11} strokeWidth={3} />
                      )}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          </section>
          <section
            className="settings-section glass"
            aria-labelledby="watching-heading"
          >
            <header className="settings-section-heading">
              <span>
                <Monitor size={18} />
              </span>
              <div>
                <h2 id="watching-heading">Your watching experience</h2>
                <p>Keep things comfortable, at your own pace.</p>
              </div>
            </header>
            <div className="settings-preference">
              <div>
                <h3 id="autoplay-label">Autoplay next video</h3>
                <p id="autoplay-description">
                  Continue to the next video in the native player.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={library.preferences.autoplay}
                aria-labelledby="autoplay-label"
                aria-describedby="autoplay-description"
                className={`settings-switch ${library.preferences.autoplay ? "is-on" : ""}`}
                onClick={() =>
                  library.setPreference(
                    "autoplay",
                    !library.preferences.autoplay,
                  )
                }
              >
                <span />
              </button>
            </div>
            <div className="settings-preference">
              <div>
                <h3 id="motion-label">Reduce motion</h3>
                <p id="motion-description">
                  A quieter interface, with fewer animations and transitions.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={library.preferences.reducedMotion}
                aria-labelledby="motion-label"
                aria-describedby="motion-description"
                className={`settings-switch ${library.preferences.reducedMotion ? "is-on" : ""}`}
                onClick={() =>
                  library.setPreference(
                    "reducedMotion",
                    !library.preferences.reducedMotion,
                  )
                }
              >
                <span />
              </button>
            </div>
          </section>
          <section
            className="settings-section glass"
            aria-labelledby="library-heading"
          >
            <header className="settings-section-heading">
              <span>
                <Database size={18} />
              </span>
              <div>
                <h2 id="library-heading">Your library belongs to you</h2>
                <p>A small collection of the things you love.</p>
              </div>
            </header>
            <div className="settings-library-stats">
              <div>
                <strong>{savedVideoCount}</strong>
                <span>saved videos</span>
              </div>
              <div>
                <strong>{library.playlists.length}</strong>
                <span>playlists</span>
              </div>
              <div>
                <strong>{library.subscriptions.length}</strong>
                <span>subscriptions</span>
              </div>
            </div>
            <div className="settings-export-row">
              <div>
                <h3>Take your collection with you</h3>
                <p>
                  Download your history, saved videos, playlists and preferences
                  as JSON.
                </p>
              </div>
              <button
                className="button button-secondary"
                onClick={exportLibrary}
              >
                <ArrowDownToLine size={15} />
                Export library
              </button>
            </div>
            {library.storageError && (
              <p className="settings-storage-error" role="alert">
                Your browser could not save the latest changes. Export your
                library before leaving this page.
              </p>
            )}
            <p className="settings-storage-note">
              <ShieldCheck size={14} />
              <span>
                Your library stays in this browser and doesn’t sync between
                devices. Clearing site data removes it.
              </span>
            </p>
          </section>
        </div>
        <aside className="settings-aside">
          <section
            className="settings-connection glass"
            aria-labelledby="connection-heading"
          >
            <div className="settings-aside-eyebrow">
              <Radio size={12} />
              <span>THE CONNECTION</span>
            </div>
            <div
              className={`settings-connection-symbol ${live ? "is-live" : ""}`}
            >
              {checking ? (
                <LoaderCircle size={26} className="settings-spinner" />
              ) : connectionError ? (
                <WifiOff size={26} />
              ) : (
                <Wifi size={26} />
              )}
            </div>
            <h2 id="connection-heading">
              {checking
                ? "Checking in…"
                : connectionError
                  ? "Taking a breather."
                  : live
                    ? "Live mode is configured."
                    : "A look around."}
            </h2>
            <p>
              {checking
                ? "Checking your video connection."
                : connectionError
                  ? "We couldn’t reach the video service. Give it another moment, then try again."
                  : live
                    ? "Your video service is configured for live discovery. Availability depends on the connected service."
                    : "You’re exploring an example catalog. A connected video service is needed for live search and playback."}
            </p>
            <div className={`settings-status-badge ${live ? "is-live" : ""}`}>
              <i />
              {checking
                ? "Checking connection"
                : connectionError
                  ? "Service unavailable"
                  : live
                    ? "Live catalog configured"
                    : "Demo catalog"}
            </div>
            {!checking && !connectionError && !live && (
              <p className="settings-hosting-note">
                <CircleHelp size={13} />
                <span>
                  Live access is configured by the person hosting this site.
                </span>
              </p>
            )}
            <button
              className="settings-recheck"
              disabled={checking}
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw
                size={12}
                className={checking ? "settings-spinner" : ""}
              />
              Check connection
            </button>
          </section>
          <section className="settings-privacy-card">
            <Leaf size={20} />
            <h3>
              Less noise.
              <br />
              More of what you love.
            </h3>
            <p>No account to create. Your preferences stay with you.</p>
            <a
              href="https://poketube.fun/privacy"
              target="_blank"
              rel="noreferrer"
            >
              About the original Poke project <ExternalLink size={11} />
            </a>
          </section>
          <div className="settings-saved-note">
            <Check size={13} />
            Preferences save as you go.
          </div>
        </aside>
      </div>
      <footer className="settings-footer">
        <span>Made for your curiosity.</span>
        <a href="/home">
          Back to discovering
          <ArrowRight size={12} />
        </a>
      </footer>
    </div>
  );
}
