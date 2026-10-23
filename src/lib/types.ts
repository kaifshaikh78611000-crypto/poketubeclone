export type DataSource = "live" | "demo";

export interface Video {
  id: string;
  title: string;
  author: string;
  authorId: string;
  thumbnail: string;
  duration: number;
  views: number;
  published: string;
  verified?: boolean;
  category?: string;
  description?: string;
  live?: boolean;
}

export interface VideoStream {
  url: string;
  type: string;
  quality: string;
}

export interface Caption {
  label: string;
  languageCode: string;
  url: string;
}

export interface VideoDetails extends Video {
  description: string;
  descriptionHtml?: string;
  likes: number;
  subscribers?: string;
  streams: VideoStream[];
  captions?: Caption[];
  related: Video[];
  source: DataSource;
  videoId?: string;
}

export interface FeedResponse {
  videos: Video[];
  source: DataSource;
  hasMore?: boolean;
}

export interface SearchResponse extends FeedResponse {
  query: string;
  page: number;
  channels?: Channel[];
  playlists?: RemotePlaylist[];
}

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  banner?: string;
  description: string;
  subscribers: number;
  verified?: boolean;
  videos: Video[];
  source: DataSource;
}

export interface Comment {
  id: string;
  author: string;
  authorId: string;
  avatar: string;
  content: string;
  published: string;
  likes: number;
  replyCount: number;
}

export interface CommentsResponse {
  comments: Comment[];
  commentCount: number;
  continuation?: string;
  source: DataSource;
}

export interface ApiStatus {
  mode: DataSource;
  configured: boolean;
  backend: string | null;
}

export interface RemotePlaylist {
  id: string;
  title: string;
  author: string;
  authorId: string;
  thumbnail: string;
  description: string;
  videoCount: number;
  views: number;
  videos: Video[];
  source: DataSource;
  page: number;
  hasMore: boolean;
}
