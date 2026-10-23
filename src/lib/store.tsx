import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Video } from "./types";

export interface Subscription {
  id: string;
  name: string;
  avatar?: string;
}
export interface Playlist {
  id: string;
  name: string;
  videos: Video[];
}
interface SavedState {
  history: Video[];
  watchLater: Video[];
  liked: Video[];
  subscriptions: Subscription[];
  playlists: Playlist[];
  preferences: {
    theme: "dark" | "light";
    autoplay: boolean;
    reducedMotion: boolean;
  };
}
const defaults: SavedState = {
  history: [],
  watchLater: [],
  liked: [],
  subscriptions: [],
  playlists: [],
  preferences: { theme: "dark", autoplay: false, reducedMotion: false },
};
function load(): SavedState {
  try {
    const parsed = JSON.parse(
      localStorage.getItem("poketube.library.v1") || "null",
    );
    if (!parsed || typeof parsed !== "object") return defaults;
    const data = { ...defaults };
    for (const key of [
      "history",
      "watchLater",
      "liked",
      "subscriptions",
      "playlists",
    ] as const) {
      if (Array.isArray(parsed[key]))
        (data[key] as unknown[]) = parsed[key].filter(
          (item: unknown) =>
            item &&
            typeof item === "object" &&
            typeof (item as { id?: unknown }).id === "string",
        );
    }
    data.playlists = data.playlists.filter(
      (item) => typeof item.name === "string" && Array.isArray(item.videos),
    );
    if (parsed.preferences && typeof parsed.preferences === "object")
      data.preferences = {
        theme: parsed.preferences.theme === "light" ? "light" : "dark",
        autoplay: parsed.preferences.autoplay === true,
        reducedMotion: parsed.preferences.reducedMotion === true,
      };
    return data;
  } catch {
    return defaults;
  }
}
function useLibraryState() {
  const [state, setState] = useState(load);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem("poketube.library.v1", JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    document.documentElement.dataset.theme = state.preferences.theme;
    document.documentElement.dataset.motion = state.preferences.reducedMotion
      ? "reduced"
      : "full";
  }, [state]);
  const toggleWatchLater = useCallback(
    (video: Video) =>
      setState((s) => ({
        ...s,
        watchLater: s.watchLater.some((v) => v.id === video.id)
          ? s.watchLater.filter((v) => v.id !== video.id)
          : [video, ...s.watchLater],
      })),
    [],
  );
  const toggleLike = useCallback(
    (video: Video) =>
      setState((s) => ({
        ...s,
        liked: s.liked.some((v) => v.id === video.id)
          ? s.liked.filter((v) => v.id !== video.id)
          : [video, ...s.liked],
      })),
    [],
  );
  const addHistory = useCallback(
    (video: Video) =>
      setState((s) => ({
        ...s,
        history: [video, ...s.history.filter((v) => v.id !== video.id)].slice(
          0,
          150,
        ),
      })),
    [],
  );
  const toggleSubscription = useCallback(
    (channel: Subscription) =>
      setState((s) => ({
        ...s,
        subscriptions: s.subscriptions.some((c) => c.id === channel.id)
          ? s.subscriptions.filter((c) => c.id !== channel.id)
          : [...s.subscriptions, channel],
      })),
    [],
  );
  const createPlaylist = useCallback((name: string) => {
    const id = crypto.randomUUID();
    setState((s) => ({
      ...s,
      playlists: [
        ...s.playlists,
        {
          id,
          name: name.trim().slice(0, 80) || "Untitled playlist",
          videos: [],
        },
      ],
    }));
    return id;
  }, []);
  const addToPlaylist = useCallback(
    (id: string, video: Video) =>
      setState((s) => ({
        ...s,
        playlists: s.playlists.map((p) =>
          p.id === id && !p.videos.some((v) => v.id === video.id)
            ? { ...p, videos: [...p.videos, video] }
            : p,
        ),
      })),
    [],
  );
  const removeFromPlaylist = useCallback(
    (id: string, videoId: string) =>
      setState((s) => ({
        ...s,
        playlists: s.playlists.map((p) =>
          p.id === id
            ? { ...p, videos: p.videos.filter((v) => v.id !== videoId) }
            : p,
        ),
      })),
    [],
  );
  const deletePlaylist = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        playlists: s.playlists.filter((p) => p.id !== id),
      })),
    [],
  );
  const clearHistory = useCallback(
    () => setState((s) => ({ ...s, history: [] })),
    [],
  );
  const setPreference = useCallback(
    <K extends keyof SavedState["preferences"]>(
      key: K,
      value: SavedState["preferences"][K],
    ) =>
      setState((s) => ({
        ...s,
        preferences: { ...s.preferences, [key]: value },
      })),
    [],
  );
  return {
    ...state,
    storageError,
    toggleWatchLater,
    toggleLike,
    addHistory,
    toggleSubscription,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    clearHistory,
    setPreference,
  };
}
const LibraryContext = createContext<ReturnType<typeof useLibraryState> | null>(
  null,
);
export function LibraryProvider({ children }: { children: ReactNode }) {
  const value = useLibraryState();
  return (
    <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
  );
}
export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("LibraryProvider is missing.");
  return value;
}
const ToastContext = createContext<(message: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<{ id: number; message: string }[]>(
    [],
  );
  const show = useCallback((message: string) => {
    const id = Date.now() + Math.random();
    setMessages((s) => [...s.slice(-2), { id, message }]);
    window.setTimeout(
      () => setMessages((s) => s.filter((item) => item.id !== id)),
      4200,
    );
  }, []);
  const value = useMemo(() => show, [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {messages.map((item) => (
          <div className="toast glass" key={item.id}>
            <span className="toast-dot" />
            {item.message}
            <button
              aria-label="Dismiss notification"
              onClick={() =>
                setMessages((s) =>
                  s.filter((message) => message.id !== item.id),
                )
              }
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
