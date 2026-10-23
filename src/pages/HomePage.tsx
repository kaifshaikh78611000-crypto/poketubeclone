import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Flame,
  Gamepad2,
  Globe2,
  Headphones,
  Leaf,
  LoaderCircle,
  Music2,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Telescope,
  Video,
} from "lucide-react";
import { getFeed } from "../lib/api";
import type { Video as VideoType } from "../lib/types";
import VideoCard from "../components/VideoCard";
import { useLibrary } from "../lib/store";
import { formatDuration } from "../lib/utils";

const categories = [
  { label: "All", icon: Sparkles },
  { label: "Music", icon: Music2 },
  { label: "Gaming", icon: Gamepad2 },
  { label: "Science & tech", icon: Telescope },
  { label: "Nature", icon: Leaf },
  { label: "Film & animation", icon: Video },
  { label: "Podcasts", icon: Headphones },
  { label: "Live", icon: Radio },
  { label: "Sports", icon: Globe2 },
];
export default function HomePage({ trending = false }: { trending?: boolean }) {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") || "All";
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [source, setSource] = useState<"live" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [sort, setSort] = useState("recommended");
  const [sortMenu, setSortMenu] = useState(false);
  const [limit, setLimit] = useState(9);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { history } = useLibrary();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setLimit(9);
    setPage(1);
    getFeed(category, controller.signal)
      .then((result) => {
        setVideos(result.videos);
        setSource(result.source);
        setHasMore(result.hasMore || false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, retry]);
  const sorted = [...videos].sort((a, b) =>
    sort === "popular"
      ? b.views - a.views
      : sort === "short"
        ? a.duration - b.duration
        : 0,
  );
  const loadMore = async () => {
    if (sorted.length > limit) {
      setLimit((value) => value + 9);
      return;
    }
    setLoadingMore(true);
    try {
      const response = await getFeed(category, undefined, page + 1);
      setVideos((current) => [
        ...current,
        ...response.videos.filter(
          (video) => !current.some((item) => item.id === video.id),
        ),
      ]);
      setPage((value) => value + 1);
      setHasMore(response.hasMore || false);
      setLimit((value) => value + 9);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };
  const browse = () =>
    document
      .getElementById("feed-start")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  const featured = videos[0];
  return (
    <div className="home-page page-enter">
      {!trending && category === "All" && (
        <section
          className="discovery-hero glass"
          aria-label="Discover your next favorite video"
        >
          <div className="hero-frost-line" aria-hidden="true" />
          <div className="hero-content">
            <span className="hero-eyebrow">
              <span /> A DIFFERENT PERSPECTIVE
            </span>
            <h1>
              Stay curious.
              <br />
              <em>See things differently.</em>
            </h1>
            <p>
              A quieter corner of the internet.
              <br className="desktop-break" /> Discover something worth your
              time.
            </p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={browse}>
                Explore the feed <ArrowUpRight size={19} />
              </button>
              <Link className="hero-secondary-action" to="/library/watch-later">
                Your saved space <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <span className="hero-visual-label">
              <Sparkles size={12} /> SOMETHING TO GET LOST IN
            </span>
            {loading ? (
              <div
                className="hero-feature hero-feature-loading glass"
                aria-label="Loading featured video"
                aria-busy="true"
              >
                <div className="skeleton hero-feature-image" />
                <span className="skeleton hero-feature-loading-line" />
                <span className="skeleton hero-feature-loading-line" />
              </div>
            ) : featured && !error ? (
              <Link
                className="hero-feature glass"
                to={`/watch?v=${encodeURIComponent(featured.id)}`}
                aria-label={`Featured video: ${featured.title}`}
              >
                <img
                  className="hero-feature-image"
                  src={featured.thumbnail}
                  alt=""
                />
                <span className="hero-feature-shade" aria-hidden="true" />
                <span className="hero-feature-topline">
                  <span className="hero-feature-label">IN FOCUS</span>
                  {(featured.live || featured.duration > 0) && (
                    <span className="hero-feature-duration">
                      {featured.live
                        ? "LIVE"
                        : formatDuration(featured.duration)}
                    </span>
                  )}
                </span>
                <span className="hero-feature-play">
                  <Play size={23} fill="currentColor" />
                </span>
                <span className="hero-feature-copy">
                  <span className="hero-feature-category">
                    {featured.category || "DISCOVER SOMETHING NEW"}
                  </span>
                  <strong>{featured.title}</strong>
                  <span className="hero-feature-author">
                    {featured.author}
                    <ArrowUpRight size={15} />
                  </span>
                </span>
              </Link>
            ) : (
              <div
                className="hero-feature hero-feature-empty glass"
                aria-hidden="true"
              >
                <Play size={38} />
                <span>A little room for possibility.</span>
              </div>
            )}
          </div>
          <div className="hero-footer">
            <span className="hero-small-note">
              <ShieldCheck size={13} /> YOUR CURIOSITY. YOUR SPACE.
            </span>
            <button className="hero-scroll-note" onClick={browse}>
              SCROLL TO EXPLORE <ArrowDown size={13} />
            </button>
          </div>
        </section>
      )}
      {trending && (
        <div className="page-heading trending-heading">
          <div>
            <span className="eyebrow">
              <Flame size={14} /> THE WORLD, RIGHT NOW
            </span>
            <h1>What’s making waves.</h1>
            <p>The videos everyone’s talking about. Find your corner of it.</p>
          </div>
          <span className="trending-pill">
            <i /> Trending now
          </span>
        </div>
      )}
      <div className="category-bar" role="group" aria-label="Video categories">
        {categories.map(({ label, icon: Icon }) => (
          <button
            className={`category-chip ${category === label ? "selected" : ""}`}
            key={label}
            onClick={() => {
              setParams(label === "All" ? {} : { category: label });
              setSort("recommended");
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
      {history.length > 0 && category === "All" && !trending && (
        <section className="continue-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PICK UP THE THREAD</span>
              <h2>Right where you left off.</h2>
            </div>
            <Link to="/library/history" className="text-link">
              View history <ArrowRight size={15} />
            </Link>
          </div>
          <div className="continue-grid">
            {history.slice(0, 3).map((video) => (
              <Link
                className="continue-card glass"
                to={`/watch?v=${encodeURIComponent(video.id)}`}
                key={video.id}
              >
                <img src={video.thumbnail} alt="" />
                <span>
                  <strong>{video.title}</strong>
                  <small>{video.author}</small>
                  <span className="continue-label">
                    <Play size={11} fill="currentColor" /> Watch again
                  </span>
                </span>
                <span className="continue-play">
                  <Play size={14} fill="currentColor" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section
        className="feed-section"
        id="feed-start"
        aria-label="Recommended videos"
      >
        <div className="section-heading feed-heading">
          <div>
            <span className="eyebrow">
              {category === "All"
                ? "FIND YOUR NEXT FASCINATION"
                : `A LITTLE MORE ${category.toUpperCase()}`}
            </span>
            <h2>
              {category === "All"
                ? trending
                  ? "On everyone’s radar."
                  : "A little out of the ordinary."
                : `A world of ${category.toLowerCase()}.`}
              <span className="heading-dot">.</span>
            </h2>
          </div>
          <div className="sort-wrap">
            <button
              className="sort-button"
              aria-expanded={sortMenu}
              onClick={() => setSortMenu(!sortMenu)}
            >
              <SlidersHorizontal size={15} />
              <span>
                {sort === "popular"
                  ? "Most popular"
                  : sort === "short"
                    ? "Shortest first"
                    : "Recommended"}
              </span>
              <ChevronDown size={13} />
            </button>
            {sortMenu && (
              <>
                <button
                  className="menu-dismiss"
                  aria-label="Close sorting menu"
                  onClick={() => setSortMenu(false)}
                />
                <div className="sort-menu glass">
                  {[
                    { id: "recommended", name: "Recommended" },
                    { id: "popular", name: "Most popular" },
                    { id: "short", name: "Shortest first" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSort(item.id);
                        setSortMenu(false);
                      }}
                    >
                      {item.name}
                      {sort === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        {error ? (
          <div className="error-state glass" role="alert">
            <Telescope size={32} />
            <h3>A small interruption.</h3>
            <p>{error}</p>
            <button
              className="button button-secondary"
              onClick={() => setRetry(retry + 1)}
            >
              <RotateCcw size={16} />
              Try again
            </button>
          </div>
        ) : loading ? (
          <div
            className="video-grid"
            aria-label="Loading videos"
            aria-busy="true"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div className="video-skeleton" key={i}>
                <div className="skeleton skeleton-image" />
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-meta" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="empty-state glass">
            <Telescope size={35} />
            <h3>A quiet corner, for now.</h3>
            <p>
              No videos in this category yet. Try another little rabbit hole.
            </p>
            <button
              className="button button-secondary"
              onClick={() => setParams({})}
            >
              Explore all videos <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="video-grid">
              {sorted.slice(0, limit).map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
            {(sorted.length > limit || hasMore) && (
              <div className="load-more-row">
                <span />
                <button
                  className="button button-secondary"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Finding more…" : "A little more discovery"}{" "}
                  {loadingMore ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <ArrowDown size={15} />
                  )}
                </button>
                <span />
              </div>
            )}
          </>
        )}
        {!loading && !error && source === "demo" && (
          <p className="preview-note">
            <span />
            An illustrative preview of your new space.{" "}
            <Link to="/settings">
              About the catalogue <ArrowUpRight size={11} />
            </Link>
          </p>
        )}
      </section>
      {!loading && category === "All" && (
        <section className="slow-banner glass">
          <div className="slow-icon">
            <Leaf size={26} />
          </div>
          <div>
            <span className="eyebrow">ON YOUR OWN TERMS</span>
            <h3>Good things can wait.</h3>
            <p>
              Collect the videos that catch your eye. Come back when you feel
              like it.
            </p>
          </div>
          <Link to="/library/watch-later" className="button button-secondary">
            Your watch later <ArrowUpRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
