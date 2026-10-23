import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
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
  SlidersHorizontal,
  Sparkles,
  Telescope,
  Video,
} from "lucide-react";
import { getFeed } from "../lib/api";
import type { Video as VideoType } from "../lib/types";
import VideoCard from "../components/VideoCard";
import { useLibrary } from "../lib/store";

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
  return (
    <div className="home-page page-enter">
      {!trending && category === "All" && (
        <section
          className="discovery-hero"
          aria-label="Discover your next favorite video"
        >
          <img
            src="/hero.jpg"
            className="hero-image"
            alt="A quiet mountain landscape beneath a sky full of stars"
          />
          <div className="hero-overlay" />
          <div className="hero-grain" />
          <div className="hero-content">
            <span className="hero-eyebrow">
              <span /> LESS NOISE. MORE DISCOVERY.
            </span>
            <h1>
              A world of wonder.
              <br />A space that’s <em>yours.</em>
            </h1>
            <p>
              Follow a little curiosity. Find your next obsession.
              <br className="desktop-break" /> Good videos, without the
              distractions.
            </p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={browse}>
                Find your next favorite <ArrowUpRight size={19} />
              </button>
              <span className="hero-small-note">
                <ShieldIcon /> Thoughtfully different.
              </span>
            </div>
          </div>
          <div className="hero-bottom-right">
            <span className="hero-location">
              <Globe2 size={13} /> A fresh perspective, every day
            </span>
            <div className="hero-pages">
              <span className="active" />
              <span />
              <span />
            </div>
          </div>
          <div className="hero-tag">
            <Sparkles size={14} /> THE ART OF GETTING LOST
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
              <span className="eyebrow">RIGHT WHERE YOU LEFT OFF</span>
              <h2>A little more of a good thing.</h2>
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
                ? "THE GOOD STUFF, ALL IN ONE PLACE"
                : `A LITTLE MORE ${category.toUpperCase()}`}
            </span>
            <h2>
              {category === "All"
                ? trending
                  ? "On everyone’s radar."
                  : "Your next rabbit hole."
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
            <span className="eyebrow">A BREATH OF FRESH AIR</span>
            <h3>Your time is yours. Make it a good watch.</h3>
            <p>Save something for later. Come back when the moment’s right.</p>
          </div>
          <Link to="/library/watch-later" className="button button-secondary">
            Your watch later <ArrowUpRight size={16} />
          </Link>
        </section>
      )}
    </div>
  );
}
function ShieldIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
