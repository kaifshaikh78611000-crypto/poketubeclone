import type {
  Caption,
  Channel,
  Comment,
  CommentsResponse,
  RemotePlaylist,
  Video,
  VideoDetails,
  VideoStream,
} from "../src/lib/types.ts";

type Item = Record<string, unknown>;
function object(input: unknown): Item {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Item)
    : {};
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function number(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function safeHttp(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return "";
  try {
    const url = new URL(
      candidate.startsWith("//") ? `https:${candidate}` : candidate,
    );
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}
function resourceUrl(value: unknown, baseUrl?: string): string {
  const direct = safeHttp(value);
  if (direct) return direct;
  const candidate = text(value);
  if (!baseUrl || !candidate.startsWith("/") || candidate.startsWith("//"))
    return "";
  try {
    return safeHttp(new URL(candidate, baseUrl).toString());
  } catch {
    return "";
  }
}
function image(value: unknown): string {
  if (typeof value === "string") return safeHttp(value);
  return (
    array(value)
      .map(object)
      .sort((a, b) => number(b.width) - number(a.width))
      .map((v) => safeHttp(v.url))
      .find(Boolean) ?? ""
  );
}
function decodeBasicHtml(value: string): string {
  return value
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

export function normalizeVideo(input: unknown): Video | undefined {
  const raw = object(input);
  // Search responses also contain channels and playlists. Neither is a video.
  if (raw.type && raw.type !== "video" && raw.type !== "shortVideo")
    return undefined;
  const id = text(raw.videoId);
  if (!id || !/^[\w-]+$/.test(id)) return undefined;
  return {
    id,
    title: text(raw.title) || "Untitled video",
    author: text(raw.author) || "Unknown creator",
    authorId: text(raw.authorId),
    thumbnail:
      image(raw.videoThumbnails) ||
      `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
    duration: number(raw.lengthSeconds),
    views: number(raw.viewCount),
    published:
      text(raw.publishedText) ||
      (number(raw.published)
        ? new Date(number(raw.published) * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : ""),
    verified: raw.authorVerified === true,
    live: raw.liveNow === true,
    category: text(raw.genre) || undefined,
    description:
      text(raw.description) || decodeBasicHtml(text(raw.descriptionHtml)),
  };
}

export function normalizeVideoDetails(
  input: unknown,
  baseUrl?: string,
): VideoDetails | undefined {
  const raw = object(input);
  const video = normalizeVideo(input);
  if (!video) return undefined;
  const streams: VideoStream[] = array(raw.formatStreams)
    .map(object)
    .map((stream) => ({
      url: safeHttp(stream.url),
      type: text(stream.type).split(";")[0] || "video/mp4",
      quality: text(stream.qualityLabel) || text(stream.quality) || "Auto",
    }))
    .filter(
      (stream) => Boolean(stream.url) && stream.type.startsWith("video/"),
    );
  const captions: Caption[] = array(raw.captions)
    .map(object)
    .map((caption) => ({
      label: text(caption.label),
      languageCode: text(caption.languageCode) || text(caption.language_code),
      url: resourceUrl(caption.url, baseUrl),
    }))
    .filter((caption) => Boolean(caption.url));
  return {
    ...video,
    videoId: video.id,
    description:
      text(raw.description) || decodeBasicHtml(text(raw.descriptionHtml)),
    // The frontend deliberately renders plain description text, never arbitrary upstream HTML.
    likes: number(raw.likeCount),
    subscribers: text(raw.subCountText) || undefined,
    streams,
    captions,
    related: array(raw.recommendedVideos)
      .map(normalizeVideo)
      .filter((item): item is Video => Boolean(item)),
    source: "live",
  };
}

export function normalizeChannel(input: unknown): Channel | undefined {
  const raw = object(input);
  const id = text(raw.authorId);
  if (!id) return undefined;
  return {
    id,
    name: text(raw.author) || "Unknown creator",
    avatar: image(raw.authorThumbnails) || "",
    banner: image(raw.authorBanners) || undefined,
    description:
      text(raw.description) || decodeBasicHtml(text(raw.descriptionHtml)),
    subscribers: number(raw.subCount),
    verified: raw.authorVerified === true,
    videos: array(raw.latestVideos || raw.videos)
      .map(normalizeVideo)
      .filter((item): item is Video => Boolean(item)),
    source: "live",
  };
}

export function normalizeComments(input: unknown): CommentsResponse {
  const raw = object(input);
  const comments: Comment[] = array(raw.comments)
    .map(object)
    .map((comment, i) => ({
      id: text(comment.commentId) || `comment-${i}`,
      author: text(comment.author) || "Viewer",
      authorId: text(comment.authorId),
      avatar: image(comment.authorThumbnail) || image(comment.authorThumbnails),
      content:
        text(comment.content) || decodeBasicHtml(text(comment.contentHtml)),
      published: text(comment.publishedText),
      likes: number(comment.likeCount),
      replyCount: number(object(comment.replies).replyCount),
    }));
  return {
    comments,
    commentCount: number(raw.commentCount) || comments.length,
    continuation: text(raw.continuation) || undefined,
    source: "live",
  };
}

export function normalizePlaylist(
  input: unknown,
  page = 1,
): RemotePlaylist | undefined {
  const raw = object(input);
  const id = text(raw.playlistId);
  if (!id || !/^[\w-]+$/.test(id)) return undefined;
  const entries = array(raw.videos).map(object);
  const videos = entries
    .map((entry) =>
      normalizeVideo({
        ...entry,
        author: entry.author || raw.author,
        authorId: entry.authorId || raw.authorId,
      }),
    )
    .filter((item): item is Video => Boolean(item));
  const videoCount = number(raw.videoCount);
  const indexes = entries
    .map((entry) => entry.index)
    .filter(
      (index): index is number =>
        typeof index === "number" && Number.isFinite(index),
    );
  // Invidious playlist pages have up to 100 entries. Prefer explicit entry indexes when available.
  const endIndex = indexes.length
    ? Math.max(...indexes) + 1
    : (page - 1) * 100 + videos.length;
  return {
    id,
    title: text(raw.title) || "Untitled playlist",
    author: text(raw.author) || "Unknown creator",
    authorId: text(raw.authorId),
    thumbnail:
      image(raw.playlistThumbnail) ||
      videos[0]?.thumbnail ||
      image(raw.authorThumbnails),
    description:
      text(raw.description) || decodeBasicHtml(text(raw.descriptionHtml)),
    videoCount,
    views: number(raw.viewCount),
    videos,
    source: "live",
    page,
    hasMore: videos.length > 0 && endIndex < videoCount,
  };
}
