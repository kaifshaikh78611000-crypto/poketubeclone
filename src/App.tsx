import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  AudioLines,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Compass,
  Flame,
  Gamepad2,
  Grid2X2,
  Heart,
  History,
  Home,
  Leaf,
  ListMusic,
  Menu,
  Music2,
  Play,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Telescope,
  Video,
  X,
} from "lucide-react";
import { getStatus, getSuggestions } from "./lib/api";
import { useLibrary, useToast } from "./lib/store";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import WatchPage from "./pages/WatchPage";
import ChannelPage from "./pages/ChannelPage";
import LibraryPage from "./pages/LibraryPage";
import SettingsPage from "./pages/SettingsPage";
import PlaylistPage from "./pages/PlaylistPage";
import ToolsPage from "./pages/ToolsPage";
import TranslatePage from "./pages/TranslatePage";

const primaryLinks = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/trending", label: "Trending", icon: Flame },
  { to: "/subscriptions", label: "Subscriptions", icon: Video },
];

function PlaylistRoute() {
  const { playlistId = "" } = useParams();
  const { playlists } = useLibrary();
  return playlists.some((playlist) => playlist.id === playlistId) ||
    /^[a-f0-9-]{36}$/i.test(playlistId) ? (
    <LibraryPage />
  ) : (
    <PlaylistPage />
  );
}
function LegacyChannelRoute() {
  const [params] = useSearchParams();
  return (
    <Navigate
      replace
      to={
        params.get("id")
          ? `/channel/${encodeURIComponent(params.get("id")!)}`
          : "/home"
      }
    />
  );
}
function LegacyAppRoute() {
  const [params] = useSearchParams();
  return params.get("query") || params.get("q") ? <SearchPage /> : <HomePage />;
}
function LegacyPlaylistRoute() {
  const [params] = useSearchParams();
  return (
    <Navigate
      replace
      to={
        params.get("list")
          ? `/playlist/${encodeURIComponent(params.get("list")!)}`
          : "/home"
      }
    />
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    playlists,
    createPlaylist,
    preferences,
    setPreference,
    storageError,
  } = useLibrary();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchIndex, setSearchIndex] = useState(-1);
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const [playlistDialog, setPlaylistDialog] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [profileMenu, setProfileMenu] = useState(false);
  const [infoDialog, setInfoDialog] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const playlistInputRef = useRef<HTMLInputElement>(null);
  const searchParams = new URLSearchParams(location.search);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileMenu(false);
    window.scrollTo({ top: 0 });
    const params = new URLSearchParams(location.search);
    setQuery(
      ["/search", "/app"].includes(location.pathname)
        ? params.get("q") || params.get("query") || ""
        : "",
    );
  }, [location.pathname, location.search]);
  useEffect(() => {
    const controller = new AbortController();
    getStatus(controller.signal)
      .then((status) => setMode(status.mode))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!query.trim() || !searchFocused) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      getSuggestions(query, controller.signal)
        .then((result) => {
          setSuggestions(result.suggestions.slice(0, 6));
          setSearchIndex(-1);
        })
        .catch(() => setSuggestions([]));
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchFocused]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const editing = /INPUT|TEXTAREA|SELECT/.test(
        (event.target as HTMLElement)?.tagName,
      );
      if (event.key === "/" && !editing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setPlaylistDialog(false);
        setProfileMenu(false);
        setInfoDialog(false);
        setSearchFocused(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    if (playlistDialog) playlistInputRef.current?.focus();
  }, [playlistDialog]);
  useEffect(() => {
    if (!playlistDialog && !infoDialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[aria-modal="true"]');
    const getFocusable = () => [
      ...(dialog?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,[tabindex="0"]',
      ) || []),
    ];
    getFocusable()[0]?.focus();
    if (playlistDialog) playlistInputRef.current?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = getFocusable();
      if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault();
        elements.at(-1)?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === elements.at(-1)
      ) {
        event.preventDefault();
        elements[0]?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [playlistDialog, infoDialog]);
  useEffect(() => {
    if (!sidebarOpen && !playlistDialog && !infoDialog) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen, playlistDialog, infoDialog]);
  const performSearch = (value: string) => {
    if (!value.trim()) return;
    setSearchFocused(false);
    setSuggestions([]);
    searchRef.current?.blur();
    navigate(`/search?q=${encodeURIComponent(value.trim())}`);
  };
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    performSearch(searchIndex >= 0 ? suggestions[searchIndex] : query);
  };
  const makePlaylist = (event: FormEvent) => {
    event.preventDefault();
    if (!playlistName.trim()) return;
    const id = createPlaylist(playlistName);
    setPlaylistDialog(false);
    setPlaylistName("");
    toast("Your new playlist is ready");
    navigate(`/playlist/${id}`);
  };

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
        aria-label="Main navigation"
      >
        <Link to="/home" className="brand" aria-label="PokeTube home">
          <span className="brand-mark">
            <Play size={19} strokeWidth={2.5} fill="currentColor" />
          </span>
          <span>
            Poke<span className="brand-light">Tube</span>
            <span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="sidebar-main">
          <span className="nav-section-title">DISCOVER</span>
          <nav className="sidebar-nav">
            {primaryLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `nav-link ${isActive || (to === "/home" && location.pathname === "/") ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{label}</span>
                {label === "Home" && <span className="nav-active-dot" />}
              </NavLink>
            ))}
          </nav>
          <span className="nav-section-title library-label">YOUR SPACE</span>
          <nav className="sidebar-nav">
            <NavLink to="/library/history" className="nav-link">
              <History size={19} />
              <span>History</span>
            </NavLink>
            <NavLink to="/library/watch-later" className="nav-link">
              <Clock3 size={19} />
              <span>Watch later</span>
            </NavLink>
            <NavLink to="/library/liked" className="nav-link">
              <Heart size={19} />
              <span>Liked videos</span>
            </NavLink>
          </nav>
          <div className="playlist-heading">
            <span className="nav-section-title">PLAYLISTS</span>
            <button
              aria-label="Create playlist"
              onClick={() => setPlaylistDialog(true)}
            >
              <Plus size={16} />
            </button>
          </div>
          <nav className="sidebar-nav playlist-nav">
            {playlists.map((playlist, i) => (
              <NavLink
                className="nav-link"
                key={playlist.id}
                to={`/playlist/${playlist.id}`}
              >
                <span className={`playlist-icon playlist-color-${i % 3}`}>
                  <ListMusic size={15} />
                </span>
                <span>{playlist.name}</span>
                <span className="playlist-count">{playlist.videos.length}</span>
              </NavLink>
            ))}
            <button
              className="nav-link create-playlist"
              onClick={() => setPlaylistDialog(true)}
            >
              <Plus size={18} />
              <span>New playlist</span>
            </button>
          </nav>
          <div className="sidebar-note">
            <span className="sidebar-note-icon">
              <Sparkles size={17} />
            </span>
            <p>
              A little less noise.
              <br />
              <strong>A lot more you.</strong>
            </p>
            <Leaf size={24} className="sidebar-note-leaf" />
          </div>
        </div>
        <div className="sidebar-bottom">
          <NavLink to="/tools" className="nav-link">
            <Grid2X2 size={18} />
            <span>More from Poke</span>
          </NavLink>
          <NavLink to="/settings" className="nav-link">
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
          <button className="nav-link" onClick={() => setInfoDialog(true)}>
            <CircleHelp size={18} />
            <span>About PokeTube</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="sidebar-footer">
            <span className="privacy-dot" />
            Your curiosity. Your space.
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={23} />
            </button>
            <Compass size={17} />
            <span>
              {location.pathname.startsWith("/watch")
                ? "Now watching"
                : location.pathname.startsWith("/channel")
                  ? "Creators"
                  : location.pathname === "/search"
                    ? "Discover something new"
                    : location.pathname.startsWith("/library") ||
                        location.pathname.startsWith("/playlist")
                      ? "Your space"
                      : location.pathname === "/settings"
                        ? "Make it yours"
                        : "Made for your curious side"}
            </span>
          </div>
          <div className="search-container">
            <form
              className={`search-field glass ${searchFocused ? "search-focused" : ""}`}
              role="search"
              onSubmit={submitSearch}
            >
              <Search size={18} />
              <input
                ref={searchRef}
                aria-label="Search videos"
                placeholder="Search anything that moves you…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() =>
                  window.setTimeout(() => setSearchFocused(false), 160)
                }
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" && suggestions.length) {
                    event.preventDefault();
                    setSearchIndex((i) => (i + 1) % suggestions.length);
                  }
                  if (event.key === "ArrowUp" && suggestions.length) {
                    event.preventDefault();
                    setSearchIndex(
                      (i) => (i - 1 + suggestions.length) % suggestions.length,
                    );
                  }
                }}
                role="combobox"
                aria-expanded={searchFocused && suggestions.length > 0}
                aria-controls="search-suggestions"
                aria-autocomplete="list"
                aria-activedescendant={
                  searchIndex >= 0 ? `suggestion-${searchIndex}` : undefined
                }
              />
              <button
                type="submit"
                className="search-submit"
                aria-label="Submit search"
              >
                <span className="search-shortcut">/</span>
                <Search className="mobile-search-icon" size={18} />
              </button>
            </form>
            {searchFocused && suggestions.length > 0 && (
              <div
                className="search-suggestions glass"
                id="search-suggestions"
                role="listbox"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    role="option"
                    aria-selected={index === searchIndex}
                    id={`suggestion-${index}`}
                    className={index === searchIndex ? "selected" : ""}
                    key={suggestion}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setQuery(suggestion);
                      performSearch(suggestion);
                    }}
                  >
                    <Search size={15} />
                    <span>{suggestion}</span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <Link
              to="/tools"
              className="icon-button tools-shortcut"
              aria-label="More from Poke"
            >
              <Grid2X2 size={18} />
            </Link>
            <button
              className="icon-button theme-toggle"
              aria-label={`Switch to ${preferences.theme === "dark" ? "light" : "dark"} theme`}
              onClick={() =>
                setPreference(
                  "theme",
                  preferences.theme === "dark" ? "light" : "dark",
                )
              }
            >
              <Sun size={19} />
            </button>
            <span className="topbar-divider" />
            <div className="profile-wrap">
              <button
                className="profile-button"
                aria-label="Your space menu"
                aria-expanded={profileMenu}
                onClick={() => setProfileMenu(!profileMenu)}
              >
                <span className="profile-avatar">
                  Y<span />
                </span>
                <ChevronDown size={13} />
              </button>
              {profileMenu && (
                <>
                  <button
                    className="menu-dismiss"
                    aria-label="Close profile menu"
                    onClick={() => setProfileMenu(false)}
                  />
                  <div className="profile-menu glass">
                    <strong>Your space</strong>
                    <small>Saved on this device</small>
                    <Link to="/library/watch-later">
                      <Clock3 size={16} />
                      Watch later
                    </Link>
                    <Link to="/settings">
                      <Settings size={16} />
                      Preferences
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            Your browser could not save changes. Your library will be kept for
            this session.
          </div>
        )}
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/trending" element={<HomePage trending />} />
            <Route
              path="/search"
              element={<SearchPage key={searchParams.get("q")} />}
            />
            <Route path="/watch" element={<WatchPage />} />
            <Route path="/channel/:id" element={<ChannelPage />} />
            <Route path="/channel" element={<LegacyChannelRoute />} />
            <Route path="/app" element={<LegacyAppRoute />} />
            <Route path="/feed/popular" element={<HomePage trending />} />
            <Route
              path="/library"
              element={<Navigate to="/library/watch-later" replace />}
            />
            <Route path="/library/:collection" element={<LibraryPage />} />
            <Route path="/playlist" element={<LegacyPlaylistRoute />} />
            <Route path="/playlist/:playlistId" element={<PlaylistRoute />} />
            <Route path="/subscriptions" element={<LibraryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/weather" element={<ToolsPage />} />
            <Route path="/map" element={<ToolsPage />} />
            <Route path="/calendar" element={<ToolsPage />} />
            <Route path="/translate" element={<TranslatePage />} />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <Telescope size={42} />
                  <h1>A little off the beaten path.</h1>
                  <p>
                    This page doesn’t exist. There’s plenty more to discover.
                  </p>
                  <Link className="button button-primary" to="/home">
                    Back to home <ArrowUpRight size={17} />
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
        <footer className="main-footer">
          <Link to="/home" className="footer-brand">
            <Play size={11} fill="currentColor" /> PokeTube
          </Link>
          <span>Stay curious. Watch differently.</span>
          <Link
            to="/settings"
            className={`connection-status ${mode === "live" ? "connected" : ""}`}
          >
            <i />
            {mode === "live"
              ? "Connected to live catalogue"
              : mode === "demo"
                ? "Preview catalogue"
                : "Checking connection"}
          </Link>
        </footer>
      </div>
      {playlistDialog && (
        <div
          className="modal-backdrop"
          onClick={() => setPlaylistDialog(false)}
        >
          <section
            className="modal glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="playlist-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close dialog"
              onClick={() => setPlaylistDialog(false)}
            >
              <X size={19} />
            </button>
            <span className="modal-icon">
              <ListMusic size={26} />
            </span>
            <span className="eyebrow">A COLLECTION OF YOU</span>
            <h2 id="playlist-dialog-title">Make room for your favorites.</h2>
            <p>Give your new playlist a name. Add videos as you explore.</p>
            <form onSubmit={makePlaylist}>
              <label htmlFor="playlist-name">Playlist name</label>
              <input
                id="playlist-name"
                ref={playlistInputRef}
                value={playlistName}
                maxLength={80}
                onChange={(event) => setPlaylistName(event.target.value)}
                placeholder="Late night rabbit holes"
                required
              />
              <button
                className="button button-primary"
                type="submit"
                disabled={!playlistName.trim()}
              >
                Create playlist <Plus size={17} />
              </button>
            </form>
            <small>Private to this browser. No account needed.</small>
          </section>
        </div>
      )}
      {infoDialog && (
        <div className="modal-backdrop" onClick={() => setInfoDialog(false)}>
          <section
            className="modal glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close about"
              onClick={() => setInfoDialog(false)}
            >
              <X size={19} />
            </button>
            <span className="modal-icon">
              <Play size={25} fill="currentColor" />
            </span>
            <span className="eyebrow">A CLEARER VIEW</span>
            <h2 id="about-dialog-title">Made for your curious side.</h2>
            <p>
              An independent, glass-inspired interface for discovering videos,
              powered by the same open Invidious API contract used by PokeTube.
            </p>
            <div className="about-features">
              <span>
                <ShieldCheck size={18} />
                Your library stays on this device
              </span>
              <span>
                <Heart size={18} />
                No account needed to collect favorites
              </span>
              <span>
                <Compass size={18} />
                Thoughtful discovery, at your pace
              </span>
            </div>
            <p className="muted">
              {mode === "demo"
                ? "You’re browsing an illustrative preview catalogue. Live discovery and native video playback require a connected video backend."
                : "This is an independent project and is not affiliated with YouTube or the original PokeTube service."}
            </p>
            <Link
              className="button button-secondary"
              to="/settings"
              onClick={() => setInfoDialog(false)}
            >
              Your preferences <ArrowUpRight size={16} />
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}
