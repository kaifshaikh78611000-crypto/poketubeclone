import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ListMusic,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Telescope,
} from "lucide-react";
import { searchVideos } from "../lib/api";
import type { Video, Channel, RemotePlaylist } from "../lib/types";
import VideoCard from "../components/VideoCard";
import { avatarColor, formatCount } from "../lib/utils";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || params.get("query") || "";
  const sort = params.get("sort") || "relevance";
  const type = params.get("type") || "all";
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [playlists, setPlaylists] = useState<RemotePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setPage(1);
    searchVideos(query, 1, sort, type, controller.signal)
      .then((result) => {
        setVideos(result.videos);
        setChannels(result.channels || []);
        setPlaylists(result.playlists || []);
        setHasMore(result.hasMore || false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, sort, type, retry]);
  const loadMore = async () => {
    setLoadingMore(true);
    setError("");
    try {
      const result = await searchVideos(query, page + 1, sort, type);
      setVideos((current) => [
        ...current,
        ...result.videos.filter(
          (video) => !current.some((item) => item.id === video.id),
        ),
      ]);
      setChannels((current) => [
        ...current,
        ...(result.channels || []).filter(
          (channel) => !current.some((item) => item.id === channel.id),
        ),
      ]);
      setPlaylists((current) => [
        ...current,
        ...(result.playlists || []).filter(
          (playlist) => !current.some((item) => item.id === playlist.id),
        ),
      ]);
      setHasMore(result.hasMore || false);
      setPage(page + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };
  return (
    <div className="search-page page-enter">
      <div className="page-heading">
        <span className="eyebrow">
          <Search size={13} /> FOLLOW YOUR CURIOSITY
        </span>
        <h1>
          {query ? (
            <>A little more “{query}”.</>
          ) : (
            "What are you curious about?"
          )}
        </h1>
        <p>
          {loading
            ? "Looking for your next favorite…"
            : `${videos.length + channels.length + playlists.length}${hasMore ? "+" : ""} things to discover${query ? ` for “${query}”` : ""}.`}
        </p>
      </div>
      <div className="search-filter-bar glass">
        <span>
          <SlidersHorizontal size={16} />
          Refine your discovery
        </span>
        <label>
          Show
          <select
            value={type}
            onChange={(event) => filter("type", event.target.value)}
          >
            <option value="all">All results</option>
            <option value="video">Videos</option>
            <option value="channel">Channels</option>
            <option value="playlist">Playlists</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            value={sort}
            onChange={(event) => filter("sort", event.target.value)}
          >
            <option value="relevance">Relevance</option>
            <option value="view_count">View count</option>
          </select>
        </label>
      </div>
      {error && (
        <div className="error-state glass" role="alert">
          <Telescope size={30} />
          <h3>We couldn’t finish that search.</h3>
          <p>{error}</p>
          <button
            className="button button-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <div
          className="video-grid"
          aria-busy="true"
          aria-label="Searching videos"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <div className="video-skeleton" key={i}>
              <div className="skeleton skeleton-image" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-meta" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {channels.length > 0 && (
            <section className="search-channel-results">
              {channels.map((channel) => (
                <Link
                  to={`/channel/${encodeURIComponent(channel.id)}`}
                  className="search-channel glass"
                  key={channel.id}
                >
                  <span
                    className="search-channel-avatar"
                    style={{ background: avatarColor(channel.name) }}
                  >
                    {channel.avatar ? (
                      <img src={channel.avatar} alt="" />
                    ) : (
                      channel.name[0]
                    )}
                  </span>
                  <div>
                    <h3>
                      {channel.name}{" "}
                      {channel.verified && <CheckCircle2 size={14} />}
                    </h3>
                    <span>{formatCount(channel.subscribers)} subscribers</span>
                    <p>{channel.description}</p>
                  </div>
                  <ArrowUpRight size={20} />
                </Link>
              ))}
            </section>
          )}
          <div className="search-playlist-results">
            {playlists.map((playlist) => (
              <Link
                className="search-playlist glass"
                to={`/playlist/${encodeURIComponent(playlist.id)}`}
                key={playlist.id}
              >
                <div>
                  {playlist.thumbnail && (
                    <img src={playlist.thumbnail} alt="" />
                  )}
                  <span>
                    <ListMusic size={15} />
                    {playlist.videoCount} videos
                  </span>
                </div>
                <span>
                  <span className="eyebrow">PLAYLIST</span>
                  <strong>{playlist.title}</strong>
                  <small>{playlist.author}</small>
                </span>
                <ArrowUpRight size={18} />
              </Link>
            ))}
          </div>
          <div className="video-grid">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
          {!error &&
            !videos.length &&
            !channels.length &&
            !playlists.length && (
              <div className="empty-state glass">
                <Search size={38} />
                <h2>A new trail might help.</h2>
                <p>
                  We couldn’t find a match. Try a different word, or discover
                  something unexpected.
                </p>
                <Link to="/home" className="button button-primary">
                  Explore home <ArrowRight size={16} />
                </Link>
              </div>
            )}
          {hasMore && (
            <div className="load-more-row">
              <button
                className="button button-secondary"
                disabled={loadingMore}
                onClick={loadMore}
              >
                {loadingMore ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
                Discover more results
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
