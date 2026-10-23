import type {
  Channel,
  RemotePlaylist,
  Video,
  VideoDetails,
} from "../src/lib/types.ts";

// An explicit offline demonstration catalogue, not a cached or live upstream feed.
// IDs identify public YouTube videos; titles and metrics below are presentation examples.
const entries: Array<
  [string, string, string, string, number, number, string, string, string]
> = [
  [
    "LXb3EKWsInQ",
    "Costa Rica in 4K — the beauty of the natural world",
    "Jacob + Katie Schwarz",
    "UCYq-iAOSZBvoUxvfzwKIZWA",
    313,
    12800000,
    "Travel",
    "2 weeks ago",
    "forest",
  ],
  [
    "jfKfPfyJRdk",
    "lofi hip hop radio — beats to relax & study to",
    "Lofi Girl",
    "UCSJ4gkVC6NrvII8umztf0Ow",
    0,
    326000,
    "Music",
    "Live now",
    "headphones-neon",
  ],
  [
    "aqz-KE-bpKQ",
    "Big Buck Bunny — a beautiful little escape",
    "Blender Studio",
    "UCz75JjEBlWcpR4C6aH0WuMw",
    596,
    2540000,
    "Animation",
    "1 month ago",
    "mountains",
  ],
  [
    "21X5lGlDOfg",
    "The world from above — live from the space station",
    "NASA",
    "UCLA_DiR1FfKNvjuUpBHmylQ",
    0,
    45000,
    "Science",
    "Live now",
    "space",
  ],
  [
    "jNQXAC9IVRw",
    "Me at the zoo — where it all began",
    "jawed",
    "UC4QobU6STFB0P71PMvOGN5A",
    19,
    348000000,
    "Lifestyle",
    "20 years ago",
    "creative",
  ],
  [
    "rfscVS0vtbw",
    "Learn Python — full course for beginners",
    "freeCodeCamp.org",
    "UC8butISFwT-Wl7EV0hUK0BQ",
    16084,
    48300000,
    "Technology",
    "6 years ago",
    "coding",
  ],
  [
    "YE7VzlLtp-4",
    "Sintel — a world of adventure",
    "Blender Studio",
    "UCz75JjEBlWcpR4C6aH0WuMw",
    888,
    6190000,
    "Animation",
    "2 weeks ago",
    "photography",
  ],
  [
    "eRsGyueVLvQ",
    "Tears of Steel — stories from the future",
    "Blender Studio",
    "UCz75JjEBlWcpR4C6aH0WuMw",
    734,
    1820000,
    "Creativity",
    "1 week ago",
    "cameras",
  ],
  [
    "PkZNo7MFNFg",
    "Learn JavaScript — full course for beginners",
    "freeCodeCamp.org",
    "UC8butISFwT-Wl7EV0hUK0BQ",
    12408,
    19400000,
    "Technology",
    "5 years ago",
    "creative-work",
  ],
  [
    "bMknfKXIFA8",
    "React course — a beginner’s tutorial",
    "freeCodeCamp.org",
    "UC8butISFwT-Wl7EV0hUK0BQ",
    42840,
    6200000,
    "Technology",
    "3 years ago",
    "laptop",
  ],
  [
    "2Vv-BfVoq4g",
    "Ed Sheeran — Perfect",
    "Ed Sheeran",
    "UC0C-w0YjGpqDXGB8IHb662A",
    280,
    3600000000,
    "Music",
    "7 years ago",
    "coffee",
  ],
  [
    "8aGhZQkoFbQ",
    "What the heck is the event loop anyway?",
    "JSConf",
    "UCzoVCacndDCfGDf41P-z0iA",
    1563,
    4100000,
    "Technology",
    "10 years ago",
    "phone",
  ],
  [
    "pQN-pnXPaVg",
    "HTML full course — build something new",
    "freeCodeCamp.org",
    "UC8butISFwT-Wl7EV0hUK0BQ",
    7399,
    8900000,
    "Creativity",
    "6 years ago",
    "design-desk",
  ],
  [
    "zw47_q9wbBE",
    "The Legend of Zelda: Breath of the Wild — trailer",
    "Nintendo of America",
    "UCGIY_O-8vW4rfX98KlMkvRg",
    229,
    34600000,
    "Gaming",
    "8 years ago",
    "craft",
  ],
  [
    "qz0aGYrrlhU",
    "HTML tutorial for beginners — your first website",
    "Programming with Mosh",
    "UCWv7vMbMWH4-V0ZXdmDpPBA",
    3698,
    10800000,
    "Technology",
    "4 years ago",
    "journals",
  ],
  [
    "JGwWNGJdvx8",
    "Ed Sheeran — Shape of You",
    "Ed Sheeran",
    "UC0C-w0YjGpqDXGB8IHb662A",
    264,
    6400000000,
    "Music",
    "8 years ago",
    "art",
  ],
  [
    "RgKAFK5djSk",
    "Wiz Khalifa — See You Again ft. Charlie Puth",
    "Wiz Khalifa",
    "UCVp3nfGRxmMadNDuVbJSk8A",
    238,
    6500000000,
    "Music",
    "10 years ago",
    "sneaker",
  ],
  [
    "ScMzIvxBSi4",
    "A moment away from the noise — sample film",
    "Nature Explorers",
    "nature-explorers",
    224,
    684000,
    "Nature",
    "3 days ago",
    "food",
  ],
];

export const demoVideos: Video[] = entries.map(
  ([
    id,
    title,
    author,
    authorId,
    duration,
    views,
    category,
    published,
    asset,
  ]) => ({
    id,
    title,
    author,
    authorId,
    duration,
    views,
    category,
    published,
    thumbnail: `/thumbnails/${asset}.jpg`,
    verified: author !== "jawed" && author !== "Nature Explorers",
    live: duration === 0,
    description: `Explore ${category.toLowerCase()} with ${author}. This is an offline catalogue example. Connect your own Invidious backend to browse current videos, details, comments, and direct video streams.`,
  }),
);

export function demoPlaybackId(id: string): string {
  return demoVideos.find((video) => video.id === id) ? id.slice(0, 11) : id;
}

export function getDemoDetails(id: string): VideoDetails | undefined {
  const video = demoVideos.find((item) => item.id === id);
  if (!video) return undefined;
  return {
    ...video,
    videoId: demoPlaybackId(id),
    description: `${video.description}\n\nYou're viewing the demonstration catalogue. Example titles and metrics are illustrative, and are not current upstream data. Playback, when available, uses the public YouTube embed for the original video.`,
    likes: Math.round(video.views / 65),
    subscribers: "1.2M",
    streams: [],
    related: demoVideos.filter((item) => item.id !== id).slice(0, 12),
    source: "demo",
  };
}

export function getDemoChannel(id: string): Channel | undefined {
  const videos = demoVideos.filter((video) => video.authorId === id);
  if (!videos.length) return undefined;
  return {
    id,
    name: videos[0].author,
    avatar: videos[0].thumbnail,
    banner: videos[0].thumbnail,
    description: `Welcome to ${videos[0].author}. A place for curiosity, creativity, and a fresh perspective. This channel page is part of the offline demonstration catalogue.`,
    subscribers: 1200000,
    verified: videos[0].verified,
    videos,
    source: "demo",
  };
}

const demoCollections: Record<string, { title: string; categories: string[] }> =
  {
    "demo-music": { title: "Music to get lost in", categories: ["Music"] },
    "demo-science-tech": {
      title: "A curious mind: science & technology",
      categories: ["Science", "Technology"],
    },
    "demo-creative": {
      title: "A little inspiration: film & creativity",
      categories: ["Animation", "Creativity"],
    },
  };
export const demoPlaylistIds = Object.keys(demoCollections);

export function getDemoPlaylist(
  id: string,
  page = 1,
): RemotePlaylist | undefined {
  const collection = demoCollections[id];
  if (!collection) return undefined;
  const allVideos = demoVideos.filter((video) =>
    collection.categories.includes(video.category || ""),
  );
  const start = (page - 1) * 12;
  return {
    id,
    title: collection.title,
    author: "PokeTube preview",
    authorId: "",
    thumbnail: allVideos[0]?.thumbnail || "",
    description:
      "An illustrative playlist from the offline demonstration catalogue. These are sample recommendations, not a live upstream playlist.",
    videoCount: allVideos.length,
    views: 0,
    videos: allVideos.slice(start, start + 12),
    source: "demo",
    page,
    hasMore: allVideos.length > start + 12,
  };
}
