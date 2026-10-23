import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock3,
  Heart,
  History,
  ListMusic,
  LockKeyhole,
  Play,
  Radio,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import VideoCard from "../components/VideoCard";
import { useLibrary, useToast } from "../lib/store";
import { avatarColor, formatDuration } from "../lib/utils";
import "./library.css";

const collections = {
  history: {
    title: "Watch history",
    short: "History",
    description: "A little rewind. Pick up where your curiosity left off.",
    empty: "Your next rabbit hole starts here.",
    hint: "Videos you open will appear here, ready for another watch.",
    icon: History,
  },
  "watch-later": {
    title: "Watch later",
    short: "Watch later",
    description: "Good finds deserve a place to come back to.",
    empty: "Keep a little something for later.",
    hint: "Tap the clock on a video to save it for your next quiet moment.",
    icon: Clock3,
  },
  liked: {
    title: "Liked videos",
    short: "Liked videos",
    description: "The things you loved, all in one lovely place.",
    empty: "Your favorites are waiting to happen.",
    hint: "Like a video while watching and it will find a home here.",
    icon: Heart,
  },
};

export default function LibraryPage() {
  const { collection = "watch-later", playlistId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const library = useLibrary();
  const toast = useToast();
  const [confirm, setConfirm] = useState<"history" | "playlist" | null>(null);
  useEffect(() => setConfirm(null), [location.pathname]);
  const subscriptionsPage = location.pathname === "/subscriptions";
  const playlist = playlistId
    ? library.playlists.find((item) => item.id === playlistId)
    : undefined;
  const collectionInfo = collections[collection as keyof typeof collections];
  const info = playlistId
    ? {
        title: playlist?.name || "Playlist not found",
        description: "A collection with your own kind of rhythm.",
        icon: ListMusic,
      }
    : subscriptionsPage
      ? {
          title: "Subscriptions",
          description: "Stay close to the creators who make your day.",
          icon: Users,
        }
      : collectionInfo;
  const videos = playlistId
    ? playlist?.videos || []
    : collection === "history"
      ? library.history
      : collection === "liked"
        ? library.liked
        : library.watchLater;
  const Icon = info?.icon || ListMusic;
  const missing =
    (playlistId && !playlist) ||
    (!playlistId && !subscriptionsPage && !collectionInfo);
  const totalDuration = videos.reduce((sum, video) => sum + video.duration, 0);
  const count = subscriptionsPage
    ? library.subscriptions.length
    : videos.length;

  const clear = () => {
    if (confirm === "history") {
      library.clearHistory();
      toast("Watch history cleared");
    } else if (confirm === "playlist" && playlistId) {
      library.deletePlaylist(playlistId);
      toast("Playlist deleted");
      navigate("/library/watch-later");
    }
    setConfirm(null);
  };

  return (
    <div className="library-page">
      <header className="library-header">
        <div>
          <div className="eyebrow">
            <span className="library-small-dot" /> YOUR SPACE
          </div>
          <h1 className="page-heading">
            {info?.title || "Collection not found"}
            <span className="library-heading-dot">.</span>
          </h1>
          <p className="muted library-intro">
            {info?.description || "This collection is no longer available."}
          </p>
        </div>
        <span className="library-device-badge">
          <LockKeyhole size={13} /> Private to this device
        </span>
      </header>

      {!playlistId && !subscriptionsPage && (
        <nav className="library-tabs" aria-label="Your library">
          {Object.entries(collections).map(([key, entry]) => {
            const TabIcon = entry.icon;
            const tabCount =
              key === "history"
                ? library.history.length
                : key === "liked"
                  ? library.liked.length
                  : library.watchLater.length;
            return (
              <Link
                key={key}
                to={`/library/${key}`}
                className={`library-tab ${collection === key ? "is-active" : ""}`}
                aria-current={collection === key ? "page" : undefined}
              >
                <TabIcon size={16} />
                {entry.short}
                <span>{tabCount}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {missing ? (
        <div className="empty-state library-empty glass">
          <div className="library-empty-icon">
            <ListMusic size={28} />
          </div>
          <h2>Nothing here just yet.</h2>
          <p>
            This collection may have been deleted or belongs to another device.
          </p>
          <Link className="button button-primary" to="/home">
            Explore videos
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <section
            className={`library-overview glass ${playlistId ? "library-playlist-overview" : ""}`}
            aria-label="Collection overview"
          >
            <div className="library-collection-art" aria-hidden="true">
              {playlistId && videos[0]?.thumbnail ? (
                <>
                  <img src={videos[0].thumbnail} alt="" />
                  <span>
                    <ListMusic size={30} />
                  </span>
                </>
              ) : (
                <Icon size={34} strokeWidth={1.5} />
              )}
            </div>
            <div className="library-overview-copy">
              <span className="eyebrow">
                {subscriptionsPage
                  ? "YOUR CREATORS"
                  : playlistId
                    ? "PERSONAL PLAYLIST"
                    : "MADE BY YOU"}
              </span>
              <h2>
                {count}{" "}
                {subscriptionsPage
                  ? count === 1
                    ? "subscription"
                    : "subscriptions"
                  : count === 1
                    ? "video"
                    : "videos"}
              </h2>
              <p>
                {subscriptionsPage
                  ? "No account needed. Just the people you choose."
                  : totalDuration
                    ? `${formatDuration(totalDuration)} of discoveries, saved for you.`
                    : "Make room for your next discovery."}
              </p>
            </div>
            <div className="library-overview-actions">
              {!subscriptionsPage && videos.length > 0 && (
                <Link
                  className="button button-primary"
                  to={`/watch?v=${encodeURIComponent(videos[0].id)}${playlistId ? `&list=${encodeURIComponent(playlistId)}` : ""}`}
                >
                  <Play size={15} fill="currentColor" />
                  Start watching
                </Link>
              )}
              {collection === "history" &&
                !playlistId &&
                !subscriptionsPage &&
                videos.length > 0 && (
                  <button
                    className="button button-secondary"
                    onClick={() => setConfirm("history")}
                  >
                    <Trash2 size={15} />
                    Clear history
                  </button>
                )}
              {playlistId && (
                <button
                  className="icon-button library-delete-playlist"
                  aria-label={`Delete ${playlist?.name}`}
                  title="Delete playlist"
                  onClick={() => setConfirm("playlist")}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
          </section>

          {confirm && (
            <section
              className="library-confirm glass"
              role="alert"
              aria-label={
                confirm === "history"
                  ? "Confirm clear watch history"
                  : "Confirm delete playlist"
              }
            >
              <div>
                <strong>
                  {confirm === "history"
                    ? "Clear your watch history?"
                    : "Delete this playlist?"}
                </strong>
                <p>
                  {confirm === "history"
                    ? "This removes your history from this device. Your saved videos and playlists will stay."
                    : "The playlist will be removed from this device. Its videos will still be available to watch."}
                </p>
              </div>
              <div className="library-confirm-actions">
                <button
                  className="button button-secondary"
                  onClick={() => setConfirm(null)}
                >
                  Keep it
                </button>
                <button
                  className="button library-danger-button"
                  onClick={clear}
                >
                  <Trash2 size={15} />
                  {confirm === "history" ? "Clear history" : "Delete playlist"}
                </button>
              </div>
            </section>
          )}

          {subscriptionsPage ? (
            library.subscriptions.length > 0 ? (
              <div className="library-channel-grid">
                {library.subscriptions.map((channel) => (
                  <article
                    className="library-channel-card glass"
                    key={channel.id}
                  >
                    <Link
                      className="library-channel-avatar"
                      style={{ background: avatarColor(channel.name) }}
                      to={`/channel/${encodeURIComponent(channel.id)}`}
                      aria-label={`View ${channel.name}`}
                    >
                      {channel.avatar ? (
                        <img
                          src={channel.avatar}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        channel.name.slice(0, 1)
                      )}
                    </Link>
                    <Link
                      className="library-channel-name"
                      to={`/channel/${encodeURIComponent(channel.id)}`}
                    >
                      {channel.name}
                    </Link>
                    <p>Your kind of creator</p>
                    <div>
                      <Link
                        className="button button-secondary"
                        to={`/channel/${encodeURIComponent(channel.id)}`}
                      >
                        Visit channel
                        <ArrowRight size={14} />
                      </Link>
                      <button
                        className="library-subscribed-button"
                        onClick={() => {
                          library.toggleSubscription(channel);
                          toast(`Unsubscribed from ${channel.name}`);
                        }}
                        title={`Unsubscribe from ${channel.name}`}
                      >
                        <Check size={14} />
                        Subscribed
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state library-empty">
                <div className="library-empty-icon">
                  <Radio size={28} />
                </div>
                <h2>Find your people.</h2>
                <p>
                  Subscribe on a channel or video page. Your favorite creators
                  will appear here.
                </p>
                <Link className="button button-primary" to="/home">
                  Discover creators
                  <ArrowRight size={16} />
                </Link>
              </div>
            )
          ) : videos.length > 0 ? (
            <>
              <div className="library-grid-heading">
                <h2>
                  {collection === "history" && !playlistId
                    ? "Recently watched"
                    : "All videos"}
                </h2>
                <span>
                  {playlistId
                    ? "Your collection, your order"
                    : "Most recent first"}
                </span>
              </div>
              <div className="library-video-grid">
                {videos.map((video) => (
                  <div className="library-video-item" key={video.id}>
                    <VideoCard video={video} />
                    {playlistId ? (
                      <button
                        className="library-remove-video"
                        onClick={() => {
                          library.removeFromPlaylist(playlistId, video.id);
                          toast("Removed from playlist");
                        }}
                        aria-label={`Remove ${video.title} from playlist`}
                      >
                        <X size={13} />
                        Remove from playlist
                      </button>
                    ) : collection === "liked" ? (
                      <button
                        className="library-remove-video"
                        onClick={() => {
                          library.toggleLike(video);
                          toast("Removed from Liked videos");
                        }}
                        aria-label={`Unlike ${video.title}`}
                      >
                        <Heart size={13} />
                        Remove like
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state library-empty">
              <div className="library-empty-icon">
                {playlistId ? <ListMusic size={28} /> : <Icon size={28} />}
              </div>
              <h2>
                {playlistId
                  ? "A fresh playlist. Endless possibilities."
                  : collectionInfo?.empty}
              </h2>
              <p>
                {playlistId
                  ? "Open a video’s menu and save it to this playlist to start your collection."
                  : collectionInfo?.hint}
              </p>
              <Link className="button button-primary" to="/home">
                Find something good
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
        </>
      )}

      {!playlistId && library.playlists.length > 0 && (
        <section className="library-playlists-section">
          <div className="library-grid-heading">
            <h2>
              <ListMusic size={18} /> Your playlists
            </h2>
            <span>{library.playlists.length} collections</span>
          </div>
          <div className="library-playlists-grid">
            {library.playlists.map((item) => (
              <Link
                key={item.id}
                to={`/playlist/${encodeURIComponent(item.id)}`}
                className="library-playlist-card glass"
              >
                <div className="library-playlist-cover">
                  {item.videos[0]?.thumbnail ? (
                    <img src={item.videos[0].thumbnail} alt="" />
                  ) : (
                    <Sparkles size={26} />
                  )}
                  <span>
                    <ListMusic size={16} />
                  </span>
                </div>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.videos.length}{" "}
                    {item.videos.length === 1 ? "video" : "videos"}
                  </p>
                </div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
