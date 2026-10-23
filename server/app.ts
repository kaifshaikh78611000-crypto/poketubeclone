import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type {
  Channel,
  FeedResponse,
  RemotePlaylist,
  SearchResponse,
  Video,
} from "../src/lib/types.ts";
import {
  demoPlaylistIds,
  demoVideos,
  getDemoChannel,
  getDemoDetails,
  getDemoPlaylist,
} from "./demo.ts";
import {
  normalizeChannel,
  normalizeComments,
  normalizePlaylist,
  normalizeVideo,
  normalizeVideoDetails,
} from "./normalize.ts";
import { ApiError, makeUpstream, validateApiUrl } from "./upstream.ts";
import { createToolsRouter } from "./tools.ts";
import { createTranslateRouter } from "./translate.ts";

export interface AppOptions {
  apiUrl?: string;
  timeoutMs?: number;
  useProxy?: boolean;
  staticDir?: string;
}

const pageSize = 12;
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const videoList = (v: unknown): Video[] =>
  list(v)
    .map(normalizeVideo)
    .filter((item): item is Video => Boolean(item));
const queryText = (v: unknown, limit = 200): string =>
  typeof v === "string" ? v.trim().slice(0, limit) : "";
function expectArray(value: unknown, resource: string): unknown[] {
  if (!Array.isArray(value))
    throw new ApiError(
      502,
      `The video backend returned an invalid ${resource} response.`,
    );
  return value;
}
function expectObject(
  value: unknown,
  resource: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ApiError(
      502,
      `The video backend returned an invalid ${resource} response.`,
    );
  return value as Record<string, unknown>;
}
function demoCategoryFilter(category: string): Video[] {
  const key = category.toLowerCase().replace(/\s+/g, " ").trim();
  if (["all", "for you", "trending"].includes(key)) return demoVideos;
  if (key === "live") return demoVideos.filter((video) => video.live);
  const aliases: Record<string, string[]> = {
    "science & tech": ["science", "technology"],
    "science and tech": ["science", "technology"],
    "film & animation": ["animation", "creativity"],
    "film and animation": ["animation", "creativity"],
    nature: ["nature", "travel"],
  };
  const categories = aliases[key] || [key];
  return demoVideos.filter((video) =>
    categories.includes(video.category?.toLowerCase() || ""),
  );
}
function identifier(v: string): string {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(v))
    throw new ApiError(400, "Invalid video or channel identifier.");
  return v;
}
function pageNumber(v: unknown): number {
  if (v === undefined) return 1;
  if (
    typeof v !== "string" ||
    !/^\d+$/.test(v) ||
    Number(v) < 1 ||
    Number(v) > 1000
  )
    throw new ApiError(400, "Page must be a number between 1 and 1000.");
  return Number(v);
}
function paginate(videos: Video[], page: number): FeedResponse {
  const start = (page - 1) * pageSize;
  return {
    videos: videos.slice(start, start + pageSize),
    source: "demo",
    hasMore: videos.length > start + pageSize,
  };
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  const apiUrl = options.apiUrl?.trim();
  const backend = apiUrl ? validateApiUrl(apiUrl) : undefined;
  const upstream = backend
    ? makeUpstream(backend, options.timeoutMs, options.useProxy)
    : undefined;
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    next();
  });
  app.use("/api", createToolsRouter());
  app.use("/api", createTranslateRouter());

  app.get("/api/status", (_req, res) => {
    res.json({
      mode: upstream ? "live" : "demo",
      configured: Boolean(upstream),
      backend: backend ? new URL(backend).origin : null,
    });
  });

  app.get("/api/feed", async (req, res) => {
    const category = queryText(req.query.category, 80) || "All";
    const page = pageNumber(req.query.page);
    if (!upstream) {
      return res.json(paginate(demoCategoryFilter(category), page));
    }
    const trending = /^(all|for you|trending|music|gaming|movies)$/i.test(
      category,
    );
    const raw = trending
      ? await upstream("/trending", {
          type: /^(music|gaming|movies)$/i.test(category)
            ? category[0].toUpperCase() + category.slice(1).toLowerCase()
            : undefined,
          hl: "en-US",
          region: "US",
        })
      : await upstream("/search", {
          q: category.replace(/&/g, "and"),
          type: "video",
          page,
          sort: "relevance",
          features: /^live$/i.test(category) ? "live" : undefined,
        });
    expectArray(raw, trending ? "trending" : "search");
    res.json({
      videos: videoList(raw),
      source: "live",
      hasMore: !trending && list(raw).length >= 20,
    } satisfies FeedResponse);
  });

  app.get("/api/search", async (req, res) => {
    const query = queryText(req.query.q);
    if (!query) throw new ApiError(400, "Enter a search term.");
    const page = pageNumber(req.query.page);
    const sortBy = queryText(req.query.sort_by, 30) || "relevance";
    if (
      ![
        "relevance",
        "rating",
        "date",
        "upload_date",
        "view_count",
        "views",
      ].includes(sortBy)
    )
      throw new ApiError(400, "Unsupported search sort order.");
    const type = queryText(req.query.type, 20) || "all";
    if (!["all", "video", "channel", "playlist", "movie"].includes(type))
      throw new ApiError(400, "Unsupported search result type.");
    if (!upstream) {
      const tokens = query.toLowerCase().split(/\s+/);
      let results = demoVideos.filter((video) =>
        tokens.every((token) =>
          `${video.title} ${video.author} ${video.category} ${video.description}`
            .toLowerCase()
            .includes(token),
        ),
      );
      if (sortBy === "view_count" || sortBy === "views")
        results = [...results].sort((a, b) => b.views - a.views);
      const channels =
        page === 1 && (type === "all" || type === "channel")
          ? [...new Set(demoVideos.map((video) => video.authorId))]
              .map(getDemoChannel)
              .filter(
                (channel): channel is Channel =>
                  Boolean(channel) &&
                  tokens.every((token) =>
                    `${channel!.name} ${channel!.description}`
                      .toLowerCase()
                      .includes(token),
                  ),
              )
          : [];
      const playlists =
        page === 1 && (type === "all" || type === "playlist")
          ? demoPlaylistIds
              .map((id) => getDemoPlaylist(id)!)
              .filter((playlist) =>
                tokens.every((token) =>
                  `${playlist.title} ${playlist.description}`
                    .toLowerCase()
                    .includes(token),
                ),
              )
          : [];
      const response: SearchResponse = {
        ...paginate(type === "all" || type === "video" ? results : [], page),
        query,
        page,
        channels,
        playlists,
      };
      return res.json(response);
    }
    const raw = await upstream("/search", {
      q: query,
      page,
      sort:
        sortBy === "view_count" || sortBy === "views"
          ? "views"
          : sortBy === "upload_date"
            ? "date"
            : sortBy,
      type,
      hl: "en-US",
      region: "US",
    });
    expectArray(raw, "search");
    const channels = list(raw)
      .filter((item) => record(item).type === "channel")
      .map(normalizeChannel)
      .filter((item): item is Channel => Boolean(item));
    const playlists = list(raw)
      .filter((item) => record(item).type === "playlist")
      .map((item) => normalizePlaylist(item))
      .filter((item): item is RemotePlaylist => Boolean(item));
    res.json({
      videos: videoList(raw),
      channels,
      playlists,
      source: "live",
      query,
      page,
      hasMore: list(raw).length >= 20,
    } satisfies SearchResponse);
  });

  app.get("/api/suggestions", async (req, res) => {
    const query = queryText(req.query.q, 100);
    if (!query)
      return res.json({
        query,
        suggestions: [],
        source: upstream ? "live" : "demo",
      });
    if (!upstream) {
      const suggestions = [
        ...new Set(
          demoVideos
            .flatMap((video) => [video.title, video.author])
            .filter((value) =>
              value.toLowerCase().includes(query.toLowerCase()),
            ),
        ),
      ].slice(0, 6);
      return res.json({ query, suggestions, source: "demo" });
    }
    const raw = expectObject(
      await upstream("/search/suggestions", { q: query }),
      "suggestions",
    );
    expectArray(raw.suggestions, "suggestions");
    res.json({
      query,
      suggestions: list(raw.suggestions)
        .filter((v) => typeof v === "string")
        .slice(0, 8),
      source: "live",
    });
  });

  app.get("/api/videos/:id", async (req, res) => {
    const id = identifier(req.params.id);
    if (!upstream) {
      const video = getDemoDetails(id);
      if (!video)
        throw new ApiError(
          404,
          "This video is not in the demonstration catalogue. Connect a video backend to watch other videos.",
        );
      return res.json(video);
    }
    const raw = await upstream(`/videos/${encodeURIComponent(id)}`);
    const video = normalizeVideoDetails(raw, backend);
    if (!video)
      throw new ApiError(
        502,
        "The video backend returned incomplete video details.",
      );
    res.json(video);
  });

  app.get("/api/channels/:id", async (req, res) => {
    const id = identifier(req.params.id);
    if (!upstream) {
      const channel = getDemoChannel(id);
      if (!channel)
        throw new ApiError(
          404,
          "This channel is not in the demonstration catalogue.",
        );
      return res.json(channel);
    }
    const channel = normalizeChannel(
      await upstream(`/channels/${encodeURIComponent(id)}`),
    );
    if (!channel)
      throw new ApiError(
        502,
        "The video backend returned incomplete channel details.",
      );
    res.json(channel);
  });

  app.get("/api/channels/:id/videos", async (req, res) => {
    const id = identifier(req.params.id);
    const page = pageNumber(req.query.page);
    if (!upstream)
      return res.json(
        paginate(
          demoVideos.filter((video) => video.authorId === id),
          page,
        ),
      );
    const raw = await upstream(`/channels/${encodeURIComponent(id)}/videos`, {
      continuation: queryText(req.query.continuation, 1000),
    });
    const data = record(raw);
    expectArray(Array.isArray(raw) ? raw : data.videos, "channel videos");
    res.json({
      videos: videoList(Array.isArray(raw) ? raw : data.videos),
      source: "live",
      hasMore: Boolean(data.continuation),
      continuation:
        typeof data.continuation === "string" ? data.continuation : undefined,
    });
  });

  app.get("/api/comments/:id", async (req, res) => {
    const id = identifier(req.params.id);
    if (!upstream) {
      if (!getDemoDetails(id))
        throw new ApiError(
          404,
          "This video is not in the demonstration catalogue.",
        );
      return res.json({ comments: [], commentCount: 0, source: "demo" });
    }
    const sortBy = queryText(req.query.sort_by, 20) || "top";
    if (!["top", "new"].includes(sortBy))
      throw new ApiError(400, "Unsupported comment sort order.");
    const raw = expectObject(
      await upstream(`/comments/${encodeURIComponent(id)}`, {
        continuation: queryText(req.query.continuation, 1000),
        sort_by: sortBy,
      }),
      "comments",
    );
    expectArray(raw.comments, "comments");
    res.json(normalizeComments(raw));
  });

  app.get("/api/playlists/:id", async (req, res) => {
    const id = identifier(req.params.id);
    const page = pageNumber(req.query.page);
    if (!upstream) {
      const playlist = getDemoPlaylist(id, page);
      if (!playlist)
        throw new ApiError(
          404,
          "This playlist is not in the demonstration catalogue. Connect a video backend to load public playlists.",
        );
      return res.json(playlist);
    }
    const raw = expectObject(
      await upstream(`/playlists/${encodeURIComponent(id)}`, {
        page,
        hl: "en-US",
      }),
      "playlist",
    );
    expectArray(raw.videos, "playlist");
    const playlist = normalizePlaylist(raw, page);
    if (!playlist)
      throw new ApiError(
        502,
        "The video backend returned incomplete playlist details.",
      );
    res.json(playlist);
  });

  app.use("/api", (_req, _res, next) =>
    next(new ApiError(404, "API route not found.")),
  );

  const staticDir = options.staticDir || resolve(process.cwd(), "dist");
  if (existsSync(resolve(staticDir, "index.html"))) {
    app.use(express.static(staticDir, { index: false, maxAge: "1h" }));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(staticDir, "index.html")),
    );
  }

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof ApiError)
        return res.status(error.status).json({ error: error.message });
      if (error instanceof URIError)
        return res.status(400).json({ error: "Invalid resource identifier." });
      console.error(
        "API request failed:",
        error instanceof Error ? error.name : "Unknown error",
      );
      return res
        .status(500)
        .json({ error: "An unexpected server error occurred." });
    },
  );
  return app;
}
