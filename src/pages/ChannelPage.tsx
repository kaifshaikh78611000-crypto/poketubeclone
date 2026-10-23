import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  Film,
  Globe2,
  Link2,
  Search,
  Users,
  X,
} from "lucide-react";
import { getChannel } from "../lib/api";
import { useLibrary, useToast } from "../lib/store";
import { formatCount } from "../lib/utils";
import type { Channel } from "../lib/types";
import VideoCard from "../components/VideoCard";
import "./channel.css";

export default function ChannelPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<"videos" | "about">("videos");
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [query, setQuery] = useState("");
  const { subscriptions, toggleSubscription } = useLibrary();
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setChannel(null);
    setTab("videos");
    setQuery("");
    setSort("latest");
    if (!id) {
      setError("This channel link is missing a channel ID.");
      setLoading(false);
      return () => controller.abort();
    }
    getChannel(id, controller.signal)
      .then(setChannel)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "We could not load this channel.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retry]);

  const subscribed = subscriptions.some((item) => item.id === channel?.id);
  const visibleVideos = useMemo(() => {
    const matching = (channel?.videos ?? []).filter((video) =>
      video.title.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return sort === "popular"
      ? [...matching].sort((a, b) => b.views - a.views)
      : matching;
  }, [channel, query, sort]);

  async function shareChannel() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Channel link copied.");
    } catch {
      toast("Could not copy the link. You can copy it from your address bar.");
    }
  }

  if (loading)
    return (
      <section
        className="channel-page"
        aria-label="Loading channel"
        aria-busy="true"
      >
        <div className="channel-banner skeleton" />
        <div className="channel-loading-head">
          <div className="channel-profile-avatar skeleton" />
          <div>
            <div className="channel-loading-title skeleton" />
            <div className="channel-loading-subtitle skeleton" />
          </div>
        </div>
        <div className="channel-videos">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="channel-card-skeleton skeleton" key={i} />
          ))}
        </div>
      </section>
    );

  if (error || !channel)
    return (
      <section className="channel-page">
        <Link to="/home" className="channel-back">
          <ArrowLeft size={17} /> Back to discovery
        </Link>
        <div className="empty-state glass channel-error">
          <Film size={34} />
          <h1>We couldn’t find that channel.</h1>
          <p>{error || "The channel is unavailable right now."}</p>
          <button
            className="button button-primary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      </section>
    );

  const initials = channel.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <section className="channel-page">
      <Link to="/home" className="channel-back">
        <ArrowLeft size={16} /> Back to discovery
      </Link>
      <div
        className={`channel-banner ${channel.banner ? "has-image" : ""}`}
        style={
          channel.banner
            ? {
                backgroundImage: `url("${channel.banner.replace(/["\\\n\r]/g, "")}")`,
              }
            : undefined
        }
      >
        <div className="channel-banner-orbit" aria-hidden="true" />
        <span className="channel-banner-tag">
          <span /> A different perspective.
        </span>
        <span className="channel-banner-word" aria-hidden="true">
          stay curious.
        </span>
      </div>
      <div className="channel-identity">
        <div className="channel-profile-avatar" aria-label={channel.name}>
          <span aria-hidden="true">{initials}</span>
          {channel.avatar && (
            <img
              src={channel.avatar}
              alt=""
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          )}
        </div>
        <div className="channel-identity-copy">
          <p className="eyebrow">THE CHANNEL</p>
          <h1>
            {channel.name}
            {channel.verified && (
              <CheckCircle2
                className="channel-verified"
                size={21}
                aria-label="Verified channel"
              />
            )}
          </h1>
          <p className="channel-meta">
            <span>{formatCount(channel.subscribers)} subscribers</span>
            <span aria-hidden="true">·</span>
            <span>{channel.videos.length} videos available</span>
            {channel.source === "demo" && (
              <span className="channel-preview">Preview</span>
            )}
          </p>
          <p className="channel-summary">
            {channel.description ||
              "A little inspiration, a fresh perspective, and something worth watching."}
          </p>
        </div>
        <div className="channel-actions">
          <button
            className={`button ${subscribed ? "button-secondary is-subscribed" : "button-primary"}`}
            onClick={() => {
              toggleSubscription({
                id: channel.id,
                name: channel.name,
                avatar: channel.avatar,
              });
              toast(
                subscribed
                  ? `Unsubscribed from ${channel.name}.`
                  : `Subscribed to ${channel.name}.`,
              );
            }}
          >
            {subscribed ? (
              <>
                <BellRing size={17} /> Subscribed <Check size={16} />
              </>
            ) : (
              <>
                <Bell size={17} /> Subscribe
              </>
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Copy channel link"
            title="Copy channel link"
            onClick={shareChannel}
          >
            <Link2 size={19} />
          </button>
        </div>
      </div>
      <div className="channel-toolbar">
        <nav className="channel-tabs" aria-label="Channel sections">
          <button
            className={tab === "videos" ? "active" : ""}
            onClick={() => setTab("videos")}
            aria-pressed={tab === "videos"}
          >
            <Film size={17} /> Videos
          </button>
          <button
            className={tab === "about" ? "active" : ""}
            onClick={() => setTab("about")}
            aria-pressed={tab === "about"}
          >
            <Globe2 size={17} /> About
          </button>
        </nav>
        {tab === "videos" && (
          <div className="channel-video-controls">
            <label className="channel-search">
              <Search size={16} />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search this channel"
                aria-label="Search this channel"
              />
              {query && (
                <button
                  aria-label="Clear channel search"
                  onClick={() => setQuery("")}
                >
                  <X size={15} />
                </button>
              )}
            </label>
            <label className="channel-sort">
              <span className="sr-only">Sort channel videos</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as "latest" | "popular")
                }
              >
                <option value="latest">Latest first</option>
                <option value="popular">Most popular</option>
              </select>
              <ChevronDown size={15} aria-hidden="true" />
            </label>
          </div>
        )}
      </div>
      {tab === "videos" ? (
        visibleVideos.length > 0 ? (
          <div className="channel-videos">
            {visibleVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="empty-state glass channel-empty">
            <Search size={30} />
            <h2>
              {query
                ? "Nothing here matches that search."
                : "No videos available yet."}
            </h2>
            <p>
              {query
                ? "Try a different title or clear your search to see all videos."
                : "Check back later for something new to watch."}
            </p>
            {query && (
              <button
                className="button button-secondary"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            )}
          </div>
        )
      ) : (
        <div className="channel-about-layout">
          <article className="channel-about glass">
            <p className="eyebrow">A LITTLE MORE ABOUT</p>
            <h2>{channel.name}</h2>
            <p className="channel-about-description">
              {channel.description ||
                "This creator hasn’t shared a description yet."}
            </p>
            <a
              className="channel-external"
              href={`https://www.youtube.com/channel/${encodeURIComponent(channel.id)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit on YouTube <ArrowUpRight size={16} />
            </a>
          </article>
          <aside className="channel-stats glass">
            <h3>Channel at a glance</h3>
            <div>
              <Users size={19} />
              <span>Subscribers</span>
              <strong>{formatCount(channel.subscribers)}</strong>
            </div>
            <div>
              <Film size={19} />
              <span>Videos available</span>
              <strong>{channel.videos.length}</strong>
            </div>
            <p>
              Subscriptions are saved on this device.{" "}
              {channel.source === "demo"
                ? "This is a preview channel; connect a live catalogue to see current activity."
                : "Video availability depends on the connected catalogue."}
            </p>
          </aside>
        </div>
      )}
    </section>
  );
}
