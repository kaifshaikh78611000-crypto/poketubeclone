import type {
  VideoDetails,
  FeedResponse,
  SearchResponse,
  Channel,
  CommentsResponse,
  RemotePlaylist,
} from "./types";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, { signal });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      body?.error || `The request could not be completed (${response.status}).`,
    );
  return body as T;
}
export const getFeed = (category = "All", signal?: AbortSignal, page = 1) =>
  request<FeedResponse>(
    `/feed?${new URLSearchParams({ category, page: String(page) })}`,
    signal,
  );
export const searchVideos = (
  query: string,
  page = 1,
  sort = "relevance",
  type = "all",
  signal?: AbortSignal,
) =>
  request<SearchResponse>(
    `/search?${new URLSearchParams({ q: query, page: String(page), sort_by: sort, type })}`,
    signal,
  );
export const getVideo = (id: string, signal?: AbortSignal) =>
  request<VideoDetails>(`/videos/${encodeURIComponent(id)}`, signal);
export const getChannel = (id: string, signal?: AbortSignal) =>
  request<Channel>(`/channels/${encodeURIComponent(id)}`, signal);
export const getComments = (
  id: string,
  sort = "top",
  continuation = "",
  signal?: AbortSignal,
) =>
  request<CommentsResponse>(
    `/comments/${encodeURIComponent(id)}?${new URLSearchParams({ sort_by: sort, continuation })}`,
    signal,
  );
export const getSuggestions = (query: string, signal?: AbortSignal) =>
  request<{ suggestions: string[] }>(
    `/suggestions?q=${encodeURIComponent(query)}`,
    signal,
  );
export const getStatus = (signal?: AbortSignal) =>
  request<{
    mode: "live" | "demo";
    configured: boolean;
    backend: string | null;
  }>("/status", signal);
export const getPlaylist = (id: string, page = 1, signal?: AbortSignal) =>
  request<RemotePlaylist>(
    `/playlists/${encodeURIComponent(id)}?page=${page}`,
    signal,
  );
