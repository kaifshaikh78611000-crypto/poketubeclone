import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { test } from "node:test";
import { createApp } from "../server/app.ts";
import {
  normalizeChannel,
  normalizeComments,
  normalizePlaylist,
  normalizeVideo,
  normalizeVideoDetails,
} from "../server/normalize.ts";
import { validateApiUrl } from "../server/upstream.ts";
import type {
  FeedResponse,
  RemotePlaylist,
  SearchResponse,
  VideoDetails,
} from "../src/lib/types.ts";

const upstreamVideo = {
  type: "video",
  videoId: "LXb3EKWsInQ",
  title: "Costa Rica in 4K",
  author: "A filmmaker",
  authorId: "UCfilmmaker",
  authorVerified: true,
  videoThumbnails: [
    { url: "https://images.example/small.jpg", width: 120, height: 90 },
    { url: "https://images.example/large.jpg", width: 1280, height: 720 },
  ],
  lengthSeconds: 313,
  viewCount: 1000,
  publishedText: "2 days ago",
};

async function start(server: Server): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}

async function stop(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

function json(response: ServerResponse, data: unknown, status = 200): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(data));
}

test("video normalizer keeps public metadata and chooses a usable thumbnail", () => {
  const video = normalizeVideo(upstreamVideo);
  assert(video);
  assert.equal(video.id, "LXb3EKWsInQ");
  assert.equal(video.authorId, "UCfilmmaker");
  assert.equal(video.title, "Costa Rica in 4K");
  assert.equal(video.duration, 313);
  assert.equal(video.views, 1000);
  assert.equal(video.published, "2 days ago");
  assert.equal(video.verified, true);
  assert.match(video.thumbnail, /^https:\/\/images\.example\//);
});

test("heterogeneous Invidious search rows cannot masquerade as videos", () => {
  assert.equal(
    normalizeVideo({
      type: "channel",
      authorId: "UCchannel",
      author: "A channel",
    }),
    undefined,
  );
  assert.equal(
    normalizeVideo({
      type: "playlist",
      playlistId: "PLsample",
      title: "A playlist",
    }),
    undefined,
  );
  assert.equal(normalizeVideo(null), undefined);
  assert.equal(normalizeVideo({ title: "No identity" }), undefined);
});

test("video details expose muxed playback streams and preserve related videos", () => {
  const details = normalizeVideoDetails({
    ...upstreamVideo,
    description: "A real description",
    descriptionHtml: "<p>A real description</p>",
    likeCount: 100,
    subCountText: "1.2M",
    formatStreams: [
      {
        url: "https://media.example/video.mp4",
        type: 'video/mp4; codecs="avc1, mp4a"',
        qualityLabel: "720p",
      },
      {
        url: "javascript:alert(1)",
        type: "video/mp4",
        qualityLabel: "Unsafe URL",
      },
    ],
    adaptiveFormats: [
      {
        url: "https://media.example/video-only.webm",
        type: "video/webm",
        qualityLabel: "1080p",
      },
    ],
    recommendedVideos: [{ ...upstreamVideo, videoId: "aqz-KE-bpKQ" }],
    captions: [
      {
        label: "English",
        languageCode: "en",
        url: "https://media.example/captions.vtt",
      },
      {
        label: "Spanish",
        language_code: "es",
        url: "https://media.example/captions-es.vtt",
      },
    ],
  });
  assert(details);
  assert.equal(details.description, "A real description");
  assert.equal(details.likes, 100);
  assert.equal(details.source, "live");
  assert.equal(details.related[0]?.id, "aqz-KE-bpKQ");
  assert.equal(
    details.streams.length,
    1,
    "adaptive video-only formats are not playable standalone streams",
  );
  assert.equal(details.streams[0]?.url, "https://media.example/video.mp4");
  assert.equal(details.captions?.[0]?.languageCode, "en");
  assert.equal(details.captions?.[1]?.languageCode, "es");
});

test("relative caption URLs resolve against the configured backend without accepting unsafe schemes", () => {
  const details = normalizeVideoDetails(
    {
      ...upstreamVideo,
      captions: [
        {
          label: "English",
          language_code: "en",
          url: "/api/v1/captions/LXb3EKWsInQ?label=English",
        },
        { label: "Unsafe", language_code: "zz", url: "javascript:alert(1)" },
      ],
    },
    "https://invidious.example/api/v1",
  );
  assert(details);
  assert.equal(details.captions?.length, 1);
  assert.equal(
    details.captions?.[0]?.url,
    "https://invidious.example/api/v1/captions/LXb3EKWsInQ?label=English",
  );
});

test("channel normalizer accepts latestVideos and channel thumbnails", () => {
  const channel = normalizeChannel({
    authorId: "UCchannel",
    author: "A channel",
    authorThumbnails: [{ url: "https://images.example/avatar.jpg", width: 88 }],
    authorBanners: [{ url: "https://images.example/banner.jpg", width: 1060 }],
    description: "Channel description",
    subCount: 1200000,
    latestVideos: [upstreamVideo],
  });
  assert(channel);
  assert.equal(channel.id, "UCchannel");
  assert.equal(channel.name, "A channel");
  assert.equal(channel.subscribers, 1200000);
  assert.equal(channel.videos[0]?.id, upstreamVideo.videoId);
  assert.equal(channel.avatar, "https://images.example/avatar.jpg");
});

test("playlist normalizer supports search cards and complete public playlist metadata", () => {
  const card = normalizePlaylist({
    type: "playlist",
    playlistId: "PLsample",
    title: "A playlist",
    playlistThumbnail: "//images.example/playlist.jpg",
    videoCount: 5,
  });
  assert(card);
  assert.equal(card.id, "PLsample");
  assert.equal(card.title, "A playlist");
  assert.equal(card.thumbnail, "https://images.example/playlist.jpg");
  assert.equal(card.videoCount, 5);
  assert.equal(card.videos.length, 0);

  const playlist = normalizePlaylist(
    {
      playlistId: "PLsample",
      title: "A public collection",
      author: "A filmmaker",
      authorId: "UCfilmmaker",
      description: "Films worth another look.",
      videoCount: 3,
      viewCount: 123456,
      videos: [upstreamVideo],
    },
    2,
  );
  assert(playlist);
  assert.equal(playlist.authorId, "UCfilmmaker");
  assert.equal(playlist.description, "Films worth another look.");
  assert.equal(playlist.views, 123456);
  assert.equal(playlist.videos[0]?.id, upstreamVideo.videoId);
  assert.equal(playlist.source, "live");
  assert.equal(playlist.page, 2);
  assert.equal(
    normalizePlaylist({ type: "channel", authorId: "UCnotaplaylist" }),
    undefined,
  );
  assert.equal(normalizePlaylist({ title: "Missing identity" }), undefined);
});

test("comment normalizer handles documented singular and legacy plural thumbnails", () => {
  const result = normalizeComments({
    commentCount: 42,
    continuation: "next-token",
    comments: [
      {
        commentId: "one",
        author: "Ada",
        authorId: "UCada",
        authorThumbnail: "https://images.example/ada.jpg",
        content: "Beautiful!",
        publishedText: "1 hour ago",
        likeCount: 12,
        replies: { replyCount: 2 },
      },
      {
        commentId: "two",
        author: "Sam",
        authorThumbnails: [
          { url: "https://images.example/sam.jpg", width: 48 },
        ],
        content: "Lovely.",
        publishedText: "2 hours ago",
        likeCount: 1,
      },
    ],
  });
  assert.equal(result.source, "live");
  assert.equal(result.commentCount, 42);
  assert.equal(result.continuation, "next-token");
  assert.equal(result.comments[0]?.avatar, "https://images.example/ada.jpg");
  assert.equal(result.comments[0]?.replyCount, 2);
  assert.equal(result.comments[1]?.avatar, "https://images.example/sam.jpg");
});

test("backend configuration rejects unsafe URL schemes, credentials, query fragments and restricted shared backend", () => {
  for (const value of [
    "file:///etc/passwd",
    "javascript:alert(1)",
    "not a URL",
    "https://name:secret@example.com/api/v1",
    "https://example.com/api/v1?token=secret",
    "https://example.com/api/v1#fragment",
    "https://invid-api.poketube.fun/api/v1",
  ]) {
    assert.throws(
      () => validateApiUrl(value),
      `expected configuration rejection: ${value}`,
    );
  }
  assert.equal(
    validateApiUrl("https://invidious.example"),
    "https://invidious.example/api/v1",
  );
  assert.equal(
    validateApiUrl("https://invidious.example/api/v1/"),
    "https://invidious.example/api/v1",
  );
  assert.equal(
    validateApiUrl("http://127.0.0.1:9000/api/v1"),
    "http://127.0.0.1:9000/api/v1",
  );
});

test("demo API is explicit, searchable, paginated and validates identifiers", async (t) => {
  const server = createServer(createApp({ useProxy: false }));
  const base = await start(server);
  t.after(() => stop(server));

  const status = await fetch(`${base}/api/status`).then((response) =>
    response.json(),
  );
  assert.equal(status.mode, "demo");
  assert.equal(status.configured, false);

  const feed = (await fetch(`${base}/api/feed`).then((response) =>
    response.json(),
  )) as FeedResponse;
  assert.equal(feed.source, "demo");
  assert(feed.videos.length > 0);
  const music = (await fetch(`${base}/api/feed?category=Music`).then(
    (response) => response.json(),
  )) as FeedResponse;
  assert(music.videos.length > 0);
  assert(music.videos.every((video) => video.category === "Music"));

  const channelsOnly = (await fetch(
    `${base}/api/search?q=NASA&type=channel`,
  ).then((response) => response.json())) as SearchResponse;
  assert.equal(channelsOnly.source, "demo");
  assert.equal(
    channelsOnly.videos.length,
    0,
    "channel-only search must exclude videos",
  );
  assert(channelsOnly.channels?.some((channel) => channel.name === "NASA"));
  const videosOnly = (await fetch(`${base}/api/search?q=NASA&type=video`).then(
    (response) => response.json(),
  )) as SearchResponse;
  assert(videosOnly.videos.length > 0);
  assert.equal(
    videosOnly.channels?.length,
    0,
    "video-only search must exclude channels",
  );

  const first = (await fetch(`${base}/api/search?q=a&page=1`).then((response) =>
    response.json(),
  )) as SearchResponse;
  const second = (await fetch(`${base}/api/search?q=a&page=2`).then(
    (response) => response.json(),
  )) as SearchResponse;
  assert.equal(first.source, "demo");
  assert.equal(first.page, 1);
  assert.equal(second.page, 2);
  assert.equal(first.videos.length, 12);
  assert(
    second.videos.length > 0,
    "the second page must actually exercise pagination",
  );
  assert(
    second.videos.every(
      (video) => !first.videos.some((previous) => previous.id === video.id),
    ),
  );

  const details = (await fetch(`${base}/api/videos/${feed.videos[0]!.id}`).then(
    (response) => response.json(),
  )) as VideoDetails;
  assert.equal(details.source, "demo");
  assert.equal(details.id, feed.videos[0]!.id);
  assert(details.related.length > 0);
  assert.equal((await fetch(`${base}/api/videos/%2Fetc`)).status, 400);
  assert.equal((await fetch(`${base}/api/videos/unknown`)).status, 404);
  const unknown = await fetch(`${base}/api/does-not-exist`);
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get("content-type") ?? "", /json/);
});

test("demo category aliases match the labels offered by the interface", async (t) => {
  const server = createServer(createApp({ useProxy: false }));
  const base = await start(server);
  t.after(() => stop(server));
  const categories: Array<[string, string[]]> = [
    ["Science & tech", ["Technology", "Science"]],
    ["Film & animation", ["Animation", "Creativity"]],
    ["Nature", ["Nature", "Travel"]],
  ];
  for (const [category, accepted] of categories) {
    const response = await fetch(
      `${base}/api/feed?${new URLSearchParams({ category })}`,
    );
    assert.equal(response.status, 200);
    const feed = (await response.json()) as FeedResponse;
    assert.equal(feed.source, "demo");
    assert(
      feed.videos.length > 0,
      `${category} should include its demonstration videos`,
    );
    assert(
      feed.videos.every((video) => accepted.includes(video.category || "")),
      `${category} must filter by its category aliases`,
    );
  }
  const live = (await fetch(`${base}/api/feed?category=Live`).then((response) =>
    response.json(),
  )) as FeedResponse;
  assert(live.videos.length > 0);
  assert(live.videos.every((video) => video.live));
});

test("live API normalizes actual upstream responses and encodes search queries", async (t) => {
  const requested: URL[] = [];
  const upstream = createServer(
    (request: IncomingMessage, response: ServerResponse) => {
      const url = new URL(request.url ?? "/", "http://upstream.local");
      requested.push(url);
      if (url.pathname === "/api/v1/trending")
        return json(response, [upstreamVideo]);
      if (url.pathname === "/api/v1/search")
        return json(response, [
          upstreamVideo,
          {
            type: "channel",
            author: "Another channel",
            authorId: "UCanother",
            subCount: 500,
          },
          { type: "playlist", playlistId: "PLexample", title: "Playlist" },
        ]);
      if (url.pathname === "/api/v1/playlists/PLsample")
        return json(response, {
          playlistId: "PLsample",
          title: "Films for the weekend",
          author: "A filmmaker",
          authorId: "UCfilmmaker",
          videoCount: 3,
          viewCount: 123456,
          description: "A public collection",
          videos: [upstreamVideo],
        });
      if (url.pathname === "/api/v1/videos/LXb3EKWsInQ")
        return json(response, {
          ...upstreamVideo,
          description: "Live upstream details",
          formatStreams: [],
          recommendedVideos: [],
        });
      return json(response, { error: "Unexpected route" }, 404);
    },
  );
  const upstreamBase = await start(upstream);
  const server = createServer(
    createApp({ apiUrl: `${upstreamBase}/api/v1`, useProxy: false }),
  );
  const base = await start(server);
  t.after(async () => {
    await stop(server);
    await stop(upstream);
  });

  const feed = (await fetch(`${base}/api/feed?category=Music`).then(
    (response) => response.json(),
  )) as FeedResponse;
  assert.equal(feed.source, "live");
  assert.equal(feed.videos[0]?.title, upstreamVideo.title);
  assert.equal(requested[0]?.pathname, "/api/v1/trending");
  assert.equal(requested[0]?.searchParams.get("type"), "Music");

  const query = "ambient & jazz? / live";
  const search = (await fetch(
    `${base}/api/search?q=${encodeURIComponent(query)}&page=2&sort_by=view_count`,
  ).then((response) => response.json())) as SearchResponse;
  assert.equal(search.source, "live");
  assert.equal(search.videos.length, 1);
  assert.equal(search.channels?.[0]?.id, "UCanother");
  assert.equal(
    search.playlists?.[0]?.id,
    "PLexample",
    "playlist search rows must normalize separately from videos",
  );
  const upstreamSearch = requested.find(
    (url) => url.pathname === "/api/v1/search",
  );
  assert.equal(upstreamSearch?.searchParams.get("q"), query);
  assert.equal(upstreamSearch?.searchParams.get("page"), "2");
  assert.equal(upstreamSearch?.searchParams.get("sort"), "views");
  assert.equal(
    upstreamSearch?.searchParams.has("sort_by"),
    false,
    "Poke upstream expects sort, not the frontend sort_by parameter",
  );

  const details = (await fetch(`${base}/api/videos/LXb3EKWsInQ`).then(
    (response) => response.json(),
  )) as VideoDetails;
  assert.equal(details.source, "live");
  assert.equal(details.description, "Live upstream details");

  const playlist = (await fetch(`${base}/api/playlists/PLsample?page=2`).then(
    (response) => response.json(),
  )) as RemotePlaylist;
  assert.equal(playlist.id, "PLsample");
  assert.equal(playlist.title, "Films for the weekend");
  assert.equal(playlist.page, 2);
  assert.equal(playlist.source, "live");
  assert.equal(playlist.videos[0]?.id, upstreamVideo.videoId);
  const upstreamPlaylist = requested.find(
    (url) => url.pathname === "/api/v1/playlists/PLsample",
  );
  assert.equal(upstreamPlaylist?.searchParams.get("page"), "2");
});

test("malformed upstream success responses fail explicitly instead of returning empty live results", async (t) => {
  const upstream = createServer((_request, response) =>
    json(response, { unexpected: "not the required response shape" }),
  );
  const upstreamBase = await start(upstream);
  const server = createServer(
    createApp({ apiUrl: upstreamBase, useProxy: false }),
  );
  const base = await start(server);
  t.after(async () => {
    await stop(server);
    await stop(upstream);
  });
  for (const path of [
    "/api/feed",
    "/api/search?q=hello",
    "/api/comments/LXb3EKWsInQ",
  ]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(
      response.status,
      502,
      `${path} must reject malformed upstream JSON`,
    );
    const body = await response.json();
    assert.equal(typeof body.error, "string");
    assert.equal(body.source, undefined);
  }
});

test("upstream failures are explicit and never silently return demonstration data", async (t) => {
  const upstream = createServer((_request, response) =>
    json(response, { error: "Upstream unavailable" }, 503),
  );
  const upstreamBase = await start(upstream);
  const server = createServer(
    createApp({ apiUrl: upstreamBase, useProxy: false }),
  );
  const base = await start(server);
  t.after(async () => {
    await stop(server);
    await stop(upstream);
  });
  const response = await fetch(`${base}/api/feed`);
  assert.equal(response.status, 502);
  const body = await response.json();
  assert(body.error);
  assert.equal(body.source, undefined);
  assert.equal(body.videos, undefined);
});

test("upstream timeout completes with an actionable 504 response", async (t) => {
  const upstream = createServer(() => {
    /* Deliberately leave the upstream request pending. */
  });
  const upstreamBase = await start(upstream);
  const server = createServer(
    createApp({ apiUrl: upstreamBase, timeoutMs: 35, useProxy: false }),
  );
  const base = await start(server);
  t.after(async () => {
    await stop(server);
    await stop(upstream);
  });
  const response = await fetch(`${base}/api/feed`);
  assert.equal(response.status, 504);
  const body = await response.json();
  assert.match(String(body.error), /timeout|timed out|respond/i);
});
