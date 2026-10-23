import {
  Check,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  Play,
  ListPlus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { Video } from "../lib/types";
import { avatarColor, formatCount, formatDuration } from "../lib/utils";
import { useLibrary, useToast } from "../lib/store";

export default function VideoCard({
  video,
  compact = false,
}: {
  video: Video;
  compact?: boolean;
}) {
  const { watchLater, toggleWatchLater, playlists, addToPlaylist } =
    useLibrary();
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [menu]);
  const saved = watchLater.some((item) => item.id === video.id);
  const save = () => {
    toggleWatchLater(video);
    toast(saved ? "Removed from Watch later" : "Added to Watch later");
    setMenu(false);
  };
  return (
    <article className={`video-card ${compact ? "video-card-compact" : ""}`}>
      <div className="video-cover">
        <Link
          to={`/watch?v=${encodeURIComponent(video.id)}`}
          aria-label={`Watch ${video.title}`}
        >
          <img
            loading="lazy"
            src={video.thumbnail}
            alt=""
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
          <span className="video-cover-play">
            <Play size={23} fill="currentColor" />
          </span>
          {video.live ? (
            <span className="video-duration video-live">
              <i /> LIVE
            </span>
          ) : video.duration > 0 ? (
            <span className="video-duration">
              {formatDuration(video.duration)}
            </span>
          ) : null}
        </Link>
        <button
          className={`card-save ${saved ? "saved" : ""}`}
          aria-label={
            saved
              ? `Remove ${video.title} from Watch later`
              : `Save ${video.title} for later`
          }
          onClick={save}
        >
          {saved ? <Check size={16} /> : <Clock3 size={16} />}
        </button>
      </div>
      <div className="video-info">
        {!compact && (
          <Link
            className="channel-avatar"
            to={`/channel/${encodeURIComponent(video.authorId)}`}
            aria-label={video.author}
            style={{ background: avatarColor(video.author) }}
          >
            {video.author.slice(0, 1)}
          </Link>
        )}
        <div className="video-copy">
          <Link
            className="video-title"
            to={`/watch?v=${encodeURIComponent(video.id)}`}
          >
            {video.title}
          </Link>
          <Link
            className="video-author"
            to={`/channel/${encodeURIComponent(video.authorId)}`}
          >
            {video.author}
            {video.verified && <CheckCircle2 size={11} fill="currentColor" />}
          </Link>
          <div className="video-meta">
            {formatCount(video.views)} views <span>·</span> {video.published}
          </div>
        </div>
        <div className="card-menu-wrap" ref={menuRef}>
          <button
            className="card-more"
            aria-label={`More options for ${video.title}`}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <MoreHorizontal size={20} />
          </button>
          {menu && (
            <div className="card-menu glass">
              <button onClick={save}>
                <Clock3 size={16} />
                {saved ? "Remove from Watch later" : "Watch later"}
              </button>
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => {
                    addToPlaylist(playlist.id, video);
                    toast(`Saved to ${playlist.name}`);
                    setMenu(false);
                  }}
                >
                  <ListPlus size={16} />
                  Save to {playlist.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
