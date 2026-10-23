import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ListMusic,
  LoaderCircle,
  Play,
  Plus,
} from "lucide-react";
import { getPlaylist } from "../lib/api";
import type { RemotePlaylist } from "../lib/types";
import { useLibrary, useToast } from "../lib/store";
import { formatCount } from "../lib/utils";
import VideoCard from "../components/VideoCard";

export default function PlaylistPage() {
  const { playlistId = "" } = useParams();
  const [playlist, setPlaylist] = useState<RemotePlaylist | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const library = useLibrary();
  const toast = useToast();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getPlaylist(playlistId, 1, controller.signal)
      .then(setPlaylist)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [playlistId, retry]);
  const saveCollection = () => {
    if (!playlist) return;
    const id = library.createPlaylist(playlist.title);
    playlist.videos.forEach((video) => library.addToPlaylist(id, video));
    toast(`${playlist.videos.length} available videos saved to your library`);
  };
  const loadMore = async () => {
    if (!playlist) return;
    setLoadingMore(true);
    setError("");
    try {
      const next = await getPlaylist(playlistId, playlist.page + 1);
      setPlaylist((current) =>
        current
          ? {
              ...next,
              videos: [
                ...current.videos,
                ...next.videos.filter(
                  (video) =>
                    !current.videos.some((item) => item.id === video.id),
                ),
              ],
            }
          : next,
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };
  if (loading)
    return (
      <div
        className="playlist-page"
        aria-busy="true"
        aria-label="Loading playlist"
      >
        <div className="skeleton" style={{ height: 220, marginBottom: 25 }} />
        <div className="video-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="skeleton skeleton-image" key={i} />
          ))}
        </div>
      </div>
    );
  if (!playlist)
    return (
      <div className="empty-state glass">
        <ListMusic size={36} />
        <h1>That collection is out of reach.</h1>
        <p>{error}</p>
        <button
          className="button button-secondary"
          onClick={() => setRetry((value) => value + 1)}
        >
          Try again
        </button>
        <Link className="text-link" to="/home">
          <ArrowLeft size={15} />
          Back to discovery
        </Link>
      </div>
    );
  return (
    <div className="playlist-page page-enter">
      <Link to="/home" className="text-link">
        <ArrowLeft size={15} />
        Back to discovery
      </Link>
      <section className="remote-playlist-hero glass">
        <div className="remote-playlist-art">
          {playlist.thumbnail ? (
            <img src={playlist.thumbnail} alt="" />
          ) : (
            <ListMusic size={45} />
          )}
          <span>
            <ListMusic size={23} />
          </span>
        </div>
        <div className="remote-playlist-copy">
          <span className="eyebrow">A COLLECTION WORTH GETTING LOST IN</span>
          <h1>{playlist.title}</h1>
          <p>{playlist.description}</p>
          <span className="remote-playlist-meta">
            {playlist.author} <i>·</i> {playlist.videoCount} videos <i>·</i>{" "}
            {formatCount(playlist.views)} views{" "}
            {playlist.source === "demo" && <em>Preview</em>}
          </span>
          <div>
            {playlist.videos[0] && (
              <Link
                className="button button-primary"
                to={`/watch?v=${encodeURIComponent(playlist.videos[0].id)}`}
              >
                <Play size={15} fill="currentColor" />
                Start watching
              </Link>
            )}
            <button
              className="button button-secondary"
              disabled={!playlist.videos.length}
              onClick={saveCollection}
            >
              <Plus size={17} />
              Save available videos
            </button>
          </div>
        </div>
      </section>
      <div className="section-heading">
        <div>
          <span className="eyebrow">ONE GOOD VIDEO DESERVES ANOTHER</span>
          <h2>In this collection.</h2>
        </div>
        <span className="muted" style={{ fontSize: 11 }}>
          {playlist.videos.length} available
        </span>
      </div>
      {error && (
        <p className="playlist-load-error" role="alert">
          {error}
        </p>
      )}
      <div className="video-grid">
        {playlist.videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {playlist.hasMore && (
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
            More in this collection
          </button>
        </div>
      )}
      {!playlist.videos.length && (
        <div className="empty-state glass">
          <ListMusic size={35} />
          <h2>A quiet collection.</h2>
          <p>No videos are currently available in this playlist.</p>
        </div>
      )}
    </div>
  );
}
