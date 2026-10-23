import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookmarkCheck,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  ListPlus,
  LoaderCircle,
  Maximize,
  MessageCircle,
  Play,
  RotateCcw,
  Share2,
  SkipBack,
  SkipForward,
  Theater,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { getComments, getVideo } from "../lib/api";
import { useLibrary, useToast } from "../lib/store";
import { formatCount } from "../lib/utils";
import type { CommentsResponse, Video, VideoDetails } from "../lib/types";
import VideoCard from "../components/VideoCard";
import "./watch.css";

function toCard(video: VideoDetails): Video {
  return {
    id: video.id,
    title: video.title,
    author: video.author,
    authorId: video.authorId,
    thumbnail: video.thumbnail,
    duration: video.duration,
    views: video.views,
    published: video.published,
    verified: video.verified,
    category: video.category,
    description: video.description,
    live: video.live,
  };
}

export default function WatchPage() {
  const [params] = useSearchParams();
  const id = params.get("v") || "";
  const listId = params.get("list") || "";
  const navigate = useNavigate();
  const library = useLibrary();
  const toast = useToast();
  const [video, setVideo] = useState<VideoDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [externalPlayer, setExternalPlayer] = useState(false);
  const [theatre, setTheatre] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [quality, setQuality] = useState(0);
  const [streamFailed, setStreamFailed] = useState(false);
  const [comments, setComments] = useState<CommentsResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState("");
  const [commentSort, setCommentSort] = useState<"top" | "new">("top");
  const [commentRetry, setCommentRetry] = useState(0);
  const [modal, setModal] = useState<"save" | "share" | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const player = useRef<HTMLDivElement>(null);
  const media = useRef<HTMLVideoElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const recorded = useRef("");
  const playbackPosition = useRef(0);
  const resumePlayback = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setVideo(null);
    setExternalPlayer(false);
    setExpanded(false);
    setQuality(0);
    setDisliked(false);
    setStreamFailed(false);
    playbackPosition.current = 0;
    resumePlayback.current = false;
    if (!id) {
      setError("Choose a video to start watching.");
      setLoading(false);
      return;
    }
    getVideo(id, controller.signal)
      .then(setVideo)
      .catch((e: Error) => {
        if (e.name !== "AbortError")
          setError(e.message || "This video could not be loaded.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, retry]);

  useEffect(() => {
    if (video && recorded.current !== video.id) {
      recorded.current = video.id;
      library.addHistory(toCard(video));
    }
  }, [video, library]);

  useEffect(() => {
    if (!video) {
      setComments(null);
      return;
    }
    const controller = new AbortController();
    setComments(null);
    setCommentsLoading(true);
    setCommentsError("");
    getComments(video.id, commentSort, undefined, controller.signal)
      .then(setComments)
      .catch((e: Error) => {
        if (e.name !== "AbortError")
          setCommentsError(e.message || "Comments are unavailable.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setCommentsLoading(false);
      });
    return () => controller.abort();
  }, [video?.id, commentSort, commentRetry]);

  useEffect(() => {
    const element = dialog.current;
    if (modal && element && !element.open) element.showModal();
    if (!modal && element?.open) element.close();
  }, [modal]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      toast("Video link copied");
    } catch {
      setModal("share");
      toast("Select the link to copy it");
    }
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await player.current?.requestFullscreen();
    } catch {
      toast("Fullscreen is unavailable in this browser");
    }
  }

  async function moreComments() {
    if (!video || !comments?.continuation || commentsLoading) return;
    setCommentsLoading(true);
    setCommentsError("");
    try {
      const next = await getComments(
        video.id,
        commentSort,
        comments.continuation,
      );
      setComments((previous) =>
        previous
          ? { ...next, comments: [...previous.comments, ...next.comments] }
          : next,
      );
    } catch (e) {
      setCommentsError(
        e instanceof Error ? e.message : "More comments could not be loaded.",
      );
    } finally {
      setCommentsLoading(false);
    }
  }

  if (loading)
    return (
      <div
        className="watch-loading"
        aria-label="Loading video"
        aria-busy="true"
      >
        <div className="skeleton watch-loading-player" />
        <div className="skeleton watch-loading-title" />
        <div className="skeleton watch-loading-meta" />
      </div>
    );
  if (!video || error)
    return (
      <div className="watch-error glass empty-state">
        <Play size={34} />
        <h1>
          {id ? "This video needs a moment." : "Find something worth watching."}
        </h1>
        <p>{error}</p>
        <div className="watch-error-actions">
          {id && (
            <button
              className="button button-primary"
              onClick={() => setRetry((n) => n + 1)}
            >
              <RotateCcw size={16} />
              Try again
            </button>
          )}
          <Link className="button button-secondary" to="/home">
            <ArrowLeft size={16} />
            Back to explore
          </Link>
        </div>
      </div>
    );

  const liked = library.liked.some((item) => item.id === video.id);
  const saved = library.watchLater.some((item) => item.id === video.id);
  const subscribed = library.subscriptions.some(
    (item) => item.id === video.authorId,
  );
  const stream = video.streams[quality];
  const localPlaylist = listId
    ? library.playlists.find((item) => item.id === listId)
    : undefined;
  const queueIndex =
    localPlaylist?.videos.findIndex((item) => item.id === video.id) ?? -1;
  const playlistQueue =
    localPlaylist && queueIndex >= 0 ? localPlaylist : undefined;
  const nextVideo = playlistQueue
    ? playlistQueue.videos[queueIndex + 1]
    : video.related.find((item) => item.id !== video.id);
  const previousVideo = playlistQueue
    ? playlistQueue.videos[queueIndex - 1]
    : undefined;
  const originalVideoId = video.videoId || video.id;
  const navigateToVideo = (next: Video) =>
    navigate(
      `/watch?v=${encodeURIComponent(next.id)}${playlistQueue ? `&list=${encodeURIComponent(playlistQueue.id)}` : ""}`,
    );
  const initials = video.author
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);

  return (
    <div className={`watch-page ${theatre ? "is-theatre" : ""}`}>
      <div className="watch-main">
        <div className="watch-player" ref={player}>
          {externalPlayer ? (
            <iframe
              title={`${video.title} — YouTube player`}
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(originalVideoId)}?autoplay=1&rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          ) : stream && !streamFailed ? (
            <video
              ref={media}
              key={`${video.id}-${quality}`}
              controls
              playsInline
              autoPlay={library.preferences.autoplay}
              poster={video.thumbnail}
              preload="metadata"
              onEnded={() => {
                if (library.preferences.autoplay && nextVideo)
                  navigateToVideo(nextVideo);
              }}
              onLoadedMetadata={(event) => {
                const element = event.currentTarget;
                if (playbackPosition.current > 0) {
                  element.currentTime = playbackPosition.current;
                  playbackPosition.current = 0;
                }
                if (resumePlayback.current) {
                  void element.play().catch(() => {});
                  resumePlayback.current = false;
                }
              }}
              onError={() => {
                setStreamFailed(true);
                toast(
                  "The stream could not be played. Try another quality or load the original player.",
                );
              }}
            >
              <source src={stream.url} type={stream.type.split(";")[0]} />
              {video.captions?.map((caption) => (
                <track
                  key={caption.languageCode}
                  kind="subtitles"
                  label={caption.label}
                  srcLang={caption.languageCode}
                  src={caption.url}
                />
              ))}
              Your browser does not support HTML video.
            </video>
          ) : (
            <div className="watch-player-preview">
              <img
                className="watch-poster"
                src={video.thumbnail}
                alt=""
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <div className="watch-poster-shade" />
              <div className="watch-player-connect">
                <span className="watch-preview-label">
                  {video.source === "demo"
                    ? "PREVIEW CATALOGUE"
                    : "EXTERNAL PLAYER"}
                </span>
                <button
                  className="watch-play-button"
                  onClick={() => setExternalPlayer(true)}
                  aria-label="Load YouTube player"
                >
                  <Play fill="currentColor" size={30} />
                </button>
                <h2>
                  {streamFailed
                    ? "Let’s try another way."
                    : "Ready when you are."}
                </h2>
                <p>
                  Load the YouTube player to watch this video.
                  <br />
                  You’ll connect directly to YouTube.
                </p>
                <button
                  className="button button-primary"
                  onClick={() => setExternalPlayer(true)}
                >
                  Load player <ExternalLink size={15} />
                </button>
              </div>
            </div>
          )}
          <div className="watch-player-toolbar">
            <span>
              {video.source === "demo" ? "Preview video" : "PokeTube player"}
            </span>
            <div>
              {video.streams.length > 1 && (
                <label className="watch-quality">
                  <span className="sr-only">Video quality</span>
                  <select
                    value={quality}
                    onChange={(event) => {
                      playbackPosition.current =
                        media.current?.currentTime || 0;
                      resumePlayback.current = media.current
                        ? !media.current.paused
                        : false;
                      setQuality(Number(event.target.value));
                      setStreamFailed(false);
                    }}
                  >
                    {video.streams.map((item, index) => (
                      <option key={`${item.quality}-${index}`} value={index}>
                        {item.quality || `Quality ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="icon-button"
                onClick={() => setTheatre((value) => !value)}
                aria-label={theatre ? "Exit theatre mode" : "Theatre mode"}
                aria-pressed={theatre}
              >
                <Theater size={17} />
              </button>
              <button
                className="icon-button"
                onClick={fullscreen}
                aria-label="Toggle fullscreen"
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>
        </div>
        {(playlistQueue || nextVideo) && (
          <section className="watch-queue glass" aria-label="Playback queue">
            <span className="watch-queue-icon">
              <ListPlus size={18} />
            </span>
            <div className="watch-queue-copy">
              <span>
                {playlistQueue ? (
                  <>
                    PLAYLIST{" "}
                    <span>
                      · {queueIndex + 1} OF {playlistQueue.videos.length}
                    </span>
                  </>
                ) : library.preferences.autoplay &&
                  stream &&
                  !externalPlayer &&
                  !streamFailed ? (
                  "AUTOPLAY IS ON"
                ) : (
                  "YOUR NEXT DISCOVERY"
                )}
              </span>
              {playlistQueue ? (
                <Link to={`/playlist/${encodeURIComponent(playlistQueue.id)}`}>
                  {playlistQueue.name}
                </Link>
              ) : (
                nextVideo && (
                  <button onClick={() => navigateToVideo(nextVideo)}>
                    {nextVideo.title}
                  </button>
                )
              )}
            </div>
            <div className="watch-queue-controls">
              {playlistQueue && (
                <button
                  className="icon-button"
                  aria-label="Previous video in playlist"
                  disabled={!previousVideo}
                  onClick={() => {
                    if (previousVideo) navigateToVideo(previousVideo);
                  }}
                >
                  <SkipBack size={17} />
                </button>
              )}
              <button
                className="icon-button"
                aria-label={
                  playlistQueue ? "Next video in playlist" : "Play next video"
                }
                disabled={!nextVideo}
                onClick={() => {
                  if (nextVideo) navigateToVideo(nextVideo);
                }}
              >
                <SkipForward size={17} />
              </button>
            </div>
          </section>
        )}
        <div className="watch-title-row">
          <span className="eyebrow">
            {video.category || "A LITTLE DISCOVERY"}
          </span>
          <a
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(originalVideoId)}`}
            target="_blank"
            rel="noreferrer"
            className="watch-original"
          >
            Open original <ExternalLink size={12} />
          </a>
        </div>
        <h1 className="watch-title">{video.title}</h1>
        <div className="watch-details-line">
          <span>{formatCount(video.views)} views</span>
          <span>•</span>
          <span>{video.published || "Recently uploaded"}</span>
          {video.source === "demo" && (
            <span className="watch-demo-pill">Preview</span>
          )}
        </div>
        <div className="watch-actions-row">
          <div className="watch-author">
            <Link
              to={`/channel/${encodeURIComponent(video.authorId)}`}
              className="watch-author-avatar"
              aria-label={`Visit ${video.author}`}
            >
              {initials}
            </Link>
            <div>
              <Link
                to={`/channel/${encodeURIComponent(video.authorId)}`}
                className="watch-author-name"
              >
                {video.author}
                {video.verified && <CheckCircle2 size={13} />}
              </Link>
              <span>{video.subscribers || "Explore this creator"}</span>
            </div>
            <button
              className={`button ${subscribed ? "button-secondary" : "button-primary"} watch-subscribe`}
              onClick={() => {
                library.toggleSubscription({
                  id: video.authorId,
                  name: video.author,
                });
                toast(
                  subscribed
                    ? "Subscription removed"
                    : `Subscribed to ${video.author}`,
                );
              }}
            >
              {subscribed ? (
                <>
                  <Check size={15} />
                  Subscribed
                </>
              ) : (
                "Subscribe"
              )}
            </button>
          </div>
          <div className="watch-social-actions">
            <div className="watch-reactions">
              <button
                aria-label="Like video"
                aria-pressed={liked}
                className={liked ? "is-active" : ""}
                onClick={() => {
                  library.toggleLike(toCard(video));
                  if (disliked) setDisliked(false);
                }}
              >
                <ThumbsUp size={17} />
                <span>{formatCount(video.likes + (liked ? 1 : 0))}</span>
              </button>
              <button
                aria-label="Dislike video"
                aria-pressed={disliked}
                className={disliked ? "is-active" : ""}
                onClick={() => {
                  setDisliked(!disliked);
                  if (liked) library.toggleLike(toCard(video));
                  toast(
                    disliked
                      ? "Feedback removed"
                      : "Feedback saved for this session",
                  );
                }}
              >
                <ThumbsDown size={17} />
              </button>
            </div>
            <button
              className="button button-secondary"
              onClick={() => {
                setShareCopied(false);
                setModal("share");
              }}
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
            <button
              className="button button-secondary"
              onClick={() => setModal("save")}
            >
              <ListPlus size={18} />
              <span>Save</span>
            </button>
          </div>
        </div>
        <section className="watch-description glass">
          <div
            className={`watch-description-text ${expanded ? "is-expanded" : ""}`}
          >
            {video.description ||
              "There’s more to discover from this creator. Visit their channel for more videos."}
          </div>
          <button
            onClick={() => setExpanded((value) => !value)}
            className="watch-description-toggle"
          >
            {expanded ? "Show less" : "Read more"}
            <ChevronDown size={14} className={expanded ? "is-expanded" : ""} />
          </button>
        </section>
        <section className="watch-comments">
          <div className="watch-section-title">
            <h2>
              {comments?.commentCount
                ? `${formatCount(comments.commentCount)} comments`
                : "The conversation"}
            </h2>
            <label className="watch-comment-sort">
              <span className="sr-only">Sort comments</span>
              <select
                value={commentSort}
                onChange={(event) =>
                  setCommentSort(event.target.value as "top" | "new")
                }
              >
                <option value="top">Top comments</option>
                <option value="new">Newest first</option>
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
          {commentsLoading && !comments && (
            <div className="watch-comments-loading">
              <LoaderCircle className="spinning" size={18} />
              Loading the conversation…
            </div>
          )}
          {commentsError && (
            <div className="watch-comment-empty glass">
              <MessageCircle size={25} />
              <p>{commentsError}</p>
              <button
                className="button button-secondary"
                onClick={() => setCommentRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          )}
          {!commentsLoading &&
            !commentsError &&
            comments?.comments.length === 0 && (
              <div className="watch-comment-empty glass">
                <MessageCircle size={25} />
                <h3>
                  {comments.source === "demo"
                    ? "A quiet corner for now."
                    : "No comments here yet."}
                </h3>
                <p>
                  {comments.source === "demo"
                    ? "Comments will appear when a live video source is connected."
                    : "This video doesn’t have any available comments."}
                </p>
              </div>
            )}
          <div className="watch-comment-list">
            {comments?.comments.map((comment) => (
              <article className="watch-comment" key={comment.id}>
                <Link
                  className="watch-comment-avatar"
                  to={`/channel/${encodeURIComponent(comment.authorId)}`}
                >
                  {comment.avatar ? (
                    <img
                      src={comment.avatar}
                      alt=""
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    comment.author.slice(0, 1)
                  )}
                </Link>
                <div className="watch-comment-body">
                  <div className="watch-comment-byline">
                    <Link
                      to={`/channel/${encodeURIComponent(comment.authorId)}`}
                    >
                      {comment.author}
                    </Link>
                    <span>{comment.published}</span>
                  </div>
                  <p>{comment.content}</p>
                  <div className="watch-comment-foot">
                    <span>
                      <ThumbsUp size={13} />
                      {formatCount(comment.likes)}
                    </span>
                    {comment.replyCount > 0 && (
                      <span>{formatCount(comment.replyCount)} replies</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {comments?.continuation && (
            <button
              className="button button-secondary watch-more-comments"
              onClick={moreComments}
              disabled={commentsLoading}
            >
              {commentsLoading ? (
                <LoaderCircle size={16} className="spinning" />
              ) : (
                <ChevronDown size={16} />
              )}
              Load more comments
            </button>
          )}
        </section>
      </div>
      <aside className="watch-related">
        <div className="watch-section-title">
          <div>
            <span className="eyebrow">KEEP EXPLORING</span>
            <h2>Up next</h2>
          </div>
          <span className="watch-related-count">{video.related.length}</span>
        </div>
        <div className="watch-related-list">
          {video.related
            .filter((item) => item.id !== video.id)
            .map((item) => (
              <VideoCard key={item.id} video={item} compact />
            ))}
        </div>
      </aside>
      <dialog
        className="watch-dialog glass"
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setModal(null);
        }}
      >
        <div className="watch-dialog-heading">
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2>
              {modal === "share"
                ? "Good things are worth sharing."
                : "Save for another moment."}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => setModal(null)}
          >
            <X size={20} />
          </button>
        </div>
        {modal === "save" ? (
          <>
            <button
              className={`watch-save-option ${saved ? "is-active" : ""}`}
              onClick={() => {
                library.toggleWatchLater(toCard(video));
                toast(
                  saved ? "Removed from Watch later" : "Saved to Watch later",
                );
              }}
            >
              {saved ? <BookmarkCheck size={21} /> : <BookmarkPlus size={21} />}
              <span>
                Watch later<small>Your next quiet moment</small>
              </span>
              {saved && <Check size={18} />}
            </button>
            {library.playlists.map((playlist) => (
              <button
                className="watch-save-option"
                key={playlist.id}
                onClick={() => {
                  library.addToPlaylist(playlist.id, toCard(video));
                  toast(`Saved to ${playlist.name}`);
                  setModal(null);
                }}
              >
                <ListPlus size={21} />
                <span>
                  {playlist.name}
                  <small>{playlist.videos.length} videos</small>
                </span>
                <ChevronDown size={16} />
              </button>
            ))}
            <form
              className="watch-new-playlist"
              onSubmit={(event) => {
                event.preventDefault();
                const name = playlistName.trim();
                if (!name) return;
                const newId = library.createPlaylist(name);
                library.addToPlaylist(newId, toCard(video));
                setPlaylistName("");
                toast(`Saved to ${name}`);
                setModal(null);
              }}
            >
              <label htmlFor="new-playlist-name">Or create a playlist</label>
              <div>
                <input
                  id="new-playlist-name"
                  maxLength={80}
                  placeholder="Give it a name…"
                  value={playlistName}
                  onChange={(event) => setPlaylistName(event.target.value)}
                />
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={!playlistName.trim()}
                >
                  Create
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="watch-share">
            <p>Send a little discovery to someone you know.</p>
            <div>
              <input
                aria-label="Video share link"
                readOnly
                value={window.location.href}
                onFocus={(event) => event.target.select()}
              />
              <button className="button button-primary" onClick={copyLink}>
                {shareCopied ? <Check size={17} /> : <Copy size={17} />}
                {shareCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${encodeURIComponent(originalVideoId)}`}
              target="_blank"
              rel="noreferrer"
            >
              Share the original YouTube video <ExternalLink size={13} />
            </a>
          </div>
        )}
      </dialog>
    </div>
  );
}
