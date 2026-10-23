import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { FeedResponse, VideoDetails } from "../src/lib/types";

// Original synthetic fixture: 1.5 seconds of color + tone, generated with FFmpeg.
// Actual HTML5 playback reaches its natural end; no external media is requested.
const playbackFixture = readFileSync(
  new URL("./fixtures/playback.mp4", import.meta.url),
);

const firstVideo = "Costa Rica in 4K — the beauty of the natural world";
const firstId = "LXb3EKWsInQ";

async function openWatch(page: Page) {
  await page.goto(`/watch?v=${firstId}`);
  await expect(page.locator(".watch-title")).toHaveText(firstVideo);
}

async function assertNoOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      ),
    )
    .toBeLessThanOrEqual(1);
}

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(
    runtimeErrors.get(page) || [],
    "The application should not throw browser runtime errors",
  ).toEqual([]);
});

test("home renders real local images and categories return to the full catalogue", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page.locator(".video-card")).toHaveCount(9);
  await expect(
    page.getByRole("heading", { name: /A world of wonder/ }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-image, .video-cover img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await assertNoOverflow(page);
  await page.screenshot({ path: "/tmp/poketube-desktop.png", fullPage: true });
  await page
    .getByRole("group", { name: "Video categories" })
    .getByRole("button", { name: "Nature", exact: true })
    .click();
  await expect(page).toHaveURL(/category=Nature/);
  await expect(
    page.getByRole("heading", { name: /A world of nature/ }),
  ).toBeVisible();
  await expect(page.locator(".video-card").first()).toBeVisible();
  await expect(page.locator(".discovery-hero")).toHaveCount(0);
  await page
    .getByRole("group", { name: "Video categories" })
    .getByRole("button", { name: "All", exact: true })
    .click();
  await expect(page.locator(".video-card")).toHaveCount(9);
  await expect(page.locator(".discovery-hero")).toBeVisible();
});

test("search finds a catalogue video and no matches show a useful empty state", async ({
  page,
}) => {
  await page.goto("/home");
  const search = page.getByRole("combobox", { name: "Search videos" });
  await search.fill("Python");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=Python/);
  await expect(
    page.locator(".video-title").filter({ hasText: "Learn Python" }),
  ).toHaveCount(1);
  await page
    .locator(".video-title")
    .filter({ hasText: "Learn Python" })
    .click();
  await expect(page.locator(".watch-title")).toContainText("Learn Python");
  await page
    .getByRole("combobox", { name: "Search videos" })
    .fill("no-results-72498-galactic-teapot");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(
    page.getByRole("heading", { name: "A new trail might help." }),
  ).toBeVisible();
  await expect(page.locator(".video-card")).toHaveCount(0);
  await page.getByRole("link", { name: "Explore home", exact: true }).click();
  await expect(page.locator(".discovery-hero")).toBeVisible();
});

test("watch later and likes survive reload and are available from the library", async ({
  page,
}) => {
  await openWatch(page);
  await page.getByRole("button", { name: "Like video", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Like video", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Watch later/ }).click();
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("link", { name: "Watch later", exact: true })
    .first()
    .click();
  await expect(page.locator(".library-video-grid .video-title")).toHaveText(
    firstVideo,
  );
  await page.reload();
  await expect(page.locator(".library-video-grid .video-title")).toHaveText(
    firstVideo,
  );
  await page
    .locator(".library-tabs")
    .getByRole("link", { name: /Liked videos/ })
    .click();
  await expect(page.locator(".library-video-grid .video-title")).toHaveText(
    firstVideo,
  );
  await page
    .locator(".library-tabs")
    .getByRole("link", { name: /History/ })
    .click();
  await expect(page.locator(".library-video-grid .video-title")).toHaveText(
    firstVideo,
  );
});

test("a playlist can be created, filled from watch, and edited", async ({
  page,
}) => {
  await page.goto("/home");
  await page
    .getByRole("button", { name: "Create playlist", exact: true })
    .click();
  const createDialog = page.getByRole("dialog");
  await createDialog
    .getByRole("textbox", { name: "Playlist name" })
    .fill("Weekend discoveries");
  await createDialog.getByRole("button", { name: "Create playlist" }).click();
  await expect(page).toHaveURL(/\/playlist\//);
  await expect(
    page.getByRole("heading", { name: "Weekend discoveries." }),
  ).toBeVisible();
  const playlistUrl = page.url();
  await openWatch(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Weekend discoveries/ })
    .click();
  await page
    .locator(".playlist-nav")
    .getByRole("link", { name: /Weekend discoveries/ })
    .click();
  await expect(page).toHaveURL(playlistUrl);
  await expect(page.locator(".library-video-grid .video-title")).toHaveText(
    firstVideo,
  );
  await page
    .getByRole("button", {
      name: `Remove ${firstVideo} from playlist`,
      exact: true,
    })
    .click();
  await expect(page.locator(".library-video-grid .video-title")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "A fresh playlist. Endless possibilities.",
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "A fresh playlist. Endless possibilities.",
    }),
  ).toBeVisible();
});

test("channel subscriptions persist, channel tabs and filtering work", async ({
  page,
}) => {
  await openWatch(page);
  await page.locator(".watch-author-name").click();
  await expect(page.locator(".channel-identity h1")).toContainText(
    "Jacob + Katie Schwarz",
  );
  await expect(page.locator(".channel-videos .video-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Subscribe", exact: true }).click();
  await expect(page.getByRole("button", { name: /Subscribed/ })).toBeVisible();
  await page.getByRole("button", { name: "About", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Channel at a glance" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Videos", exact: true }).click();
  await page
    .getByRole("searchbox", { name: "Search this channel" })
    .fill("no-match-in-this-channel");
  await expect(
    page.getByRole("heading", { name: "Nothing here matches that search." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator(".channel-videos .video-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Subscriptions", exact: true }).click();
  await expect(page.locator(".library-channel-name")).toHaveText(
    "Jacob + Katie Schwarz",
  );
  await page.reload();
  await expect(page.locator(".library-channel-name")).toHaveText(
    "Jacob + Katie Schwarz",
  );
});

test("settings theme and motion preferences persist", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: /Daylight/ }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await expect(
    page.getByRole("switch", { name: "Reduce motion" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(
    page.getByRole("switch", { name: "Reduce motion" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Demo catalog", { exact: true })).toBeVisible();
});

test("invalid and missing watch links have recoverable errors", async ({
  page,
}) => {
  await page.goto("/watch?v=invalid-video-id");
  await expect(
    page.getByRole("heading", { name: "This video needs a moment." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to explore" }).click();
  await expect(page.locator(".discovery-hero")).toBeVisible();
  await page.goto("/watch");
  await expect(
    page.getByRole("heading", { name: "Find something worth watching." }),
  ).toBeVisible();
});

test("mobile discovery, watch and navigation stay within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/home");
  await expect(page.locator(".video-card").first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-image")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await assertNoOverflow(page);
  await page.locator(".video-cover img").evaluateAll((images) =>
    images.forEach((image) => {
      (image as HTMLImageElement).loading = "eager";
    }),
  );
  await expect
    .poll(() =>
      page
        .locator(".video-cover img")
        .evaluateAll((images) =>
          images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
        ),
    )
    .toBe(true);
  await page.screenshot({ path: "/tmp/poketube-mobile.png", fullPage: true });
  await page.locator(".video-title").first().click();
  await expect(page.locator(".watch-title")).toHaveText(firstVideo);
  await assertNoOverflow(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Watch later/ })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close dialog" })
    .click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("complementary", { name: "Main navigation" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Watch later", exact: true })
    .first()
    .click();
  await expect(page.locator(".library-video-grid .video-title")).toHaveText(
    firstVideo,
  );
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toHaveAttribute("aria-expanded", "false");
  await assertNoOverflow(page);
});

test("native playback reaches its end and only advances when autoplay is enabled", async ({
  page,
}) => {
  const response = await page.request.get(`/api/videos/${firstId}`);
  const details = (await response.json()) as VideoDetails;
  const next = details.related.find((video) => video.id !== firstId)!;
  expect(next).toBeTruthy();
  await page.route(`**/api/videos/${firstId}`, (route) =>
    route.fulfill({
      json: {
        ...details,
        source: "live",
        streams: [
          {
            url: "/__test__/playback.mp4",
            type: "video/mp4",
            quality: "Test fixture",
          },
        ],
      },
    }),
  );
  await page.route("**/__test__/playback.mp4", (route) =>
    route.fulfill({ body: playbackFixture, contentType: "video/mp4" }),
  );
  await openWatch(page);
  const video = page.locator(".watch-player video");
  await expect(video).toBeVisible();
  await video.evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    media.muted = true;
    await media.play();
  });
  await expect
    .poll(() =>
      video.evaluate((element) => (element as HTMLVideoElement).ended),
    )
    .toBe(true);
  await expect(page).toHaveURL(new RegExp(`/watch\\?v=${firstId}$`));
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Autoplay next video" }).click();
  await expect(
    page.getByRole("switch", { name: "Autoplay next video" }),
  ).toHaveAttribute("aria-checked", "true");
  await openWatch(page);
  await page.locator(".watch-player video").evaluate(async (element) => {
    const media = element as HTMLVideoElement;
    media.muted = true;
    await media.play();
  });
  await expect(page).toHaveURL(new RegExp(`/watch\\?v=${next.id}$`));
  await expect(page.locator(".watch-title")).toHaveText(next.title);
});

test("a local playlist takes priority over related videos and exposes previous and next controls", async ({
  page,
}) => {
  const response = await page.request.get("/api/feed");
  const feed = (await response.json()) as FeedResponse;
  const cards = [feed.videos[0], feed.videos[2]];
  await page.addInitScript((videos) => {
    localStorage.setItem(
      "poketube.library.v1",
      JSON.stringify({
        playlists: [{ id: "test-queue", name: "Our little queue", videos }],
        preferences: { theme: "dark", autoplay: false, reducedMotion: true },
      }),
    );
  }, cards);
  await page.goto(`/watch?v=${cards[0].id}&list=test-queue`);
  await expect(
    page.getByRole("region", { name: "Playback queue" }),
  ).toContainText("Our little queue");
  await expect(
    page.getByRole("button", { name: "Previous video in playlist" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Next video in playlist" }).click();
  await expect(page).toHaveURL(new RegExp(`v=${cards[1].id}&list=test-queue`));
  await expect(page.locator(".watch-title")).toHaveText(cards[1].title);
  await expect(
    page.getByRole("button", { name: "Next video in playlist" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Previous video in playlist" })
    .click();
  await expect(page.locator(".watch-title")).toHaveText(cards[0].title);
  await expect(page).toHaveURL(new RegExp(`v=${cards[0].id}&list=test-queue`));
});

test("home loads the full paginated catalogue without duplicate videos and stops at the end", async ({
  page,
}) => {
  await page.goto("/home");
  await expect(page.locator(".video-card")).toHaveCount(9);
  const more = page.getByRole("button", {
    name: "A little more discovery",
    exact: true,
  });
  await more.click();
  await expect(page.locator(".video-card")).toHaveCount(12);
  await more.click();
  await expect(page.locator(".video-card")).toHaveCount(18);
  const titles = await page.locator(".video-title").allTextContents();
  expect(new Set(titles).size).toBe(18);
  await expect(more).toHaveCount(0);
});

test("a remote playlist can be saved as an editable local collection", async ({
  page,
}) => {
  await page.goto("/playlist/demo-music");
  await expect(page.locator(".remote-playlist-copy h1")).toHaveText(
    "Music to get lost in",
  );
  await expect(page.locator(".playlist-page .video-card")).toHaveCount(4);
  await page.getByRole("button", { name: "Save available videos" }).click();
  const local = page
    .locator(".playlist-nav")
    .getByRole("link", { name: /Music to get lost in/ });
  await expect(local).toBeVisible();
  await expect(local).not.toHaveAttribute("href", "/playlist/demo-music");
  await local.click();
  await expect(page.locator(".library-header h1")).toHaveText(
    "Music to get lost in.",
  );
  await expect(page.locator(".library-video-grid .video-card")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: /Remove .* from playlist/ }),
  ).toHaveCount(4);
  await page.reload();
  await expect(page.locator(".library-video-grid .video-card")).toHaveCount(4);
});

test("playlist search results link to playable remote collections", async ({
  page,
}) => {
  await page.goto("/search?q=music&type=playlist");
  await expect(page.locator(".search-playlist")).toHaveCount(1);
  await expect(page.locator(".search-playlist")).toHaveAttribute(
    "href",
    "/playlist/demo-music",
  );
  await expect(page.locator(".search-playlist")).toContainText(
    "Music to get lost in",
  );
  await expect(page.locator(".video-card")).toHaveCount(0);
  await page.locator(".search-playlist").click();
  await expect(page.locator(".remote-playlist-copy h1")).toHaveText(
    "Music to get lost in",
  );
  await page.getByRole("link", { name: "Start watching", exact: true }).click();
  await expect(page.locator(".watch-title")).toHaveText(
    "lofi hip hop radio — beats to relax & study to",
  );
});

test("legacy search and channel URLs resolve to the corresponding catalogue content", async ({
  page,
}) => {
  await page.goto("/search?query=Python");
  await expect(page.locator(".video-title")).toHaveText(
    "Learn Python — full course for beginners",
  );
  await expect(
    page.getByRole("heading", { name: /A little more “Python”/ }),
  ).toBeVisible();
  const response = await page.request.get(`/api/videos/${firstId}`);
  const video = (await response.json()) as VideoDetails;
  await page.goto(`/channel?id=${encodeURIComponent(video.authorId)}`);
  await expect(page).toHaveURL(new RegExp(`/channel/${video.authorId}$`));
  await expect(page.locator(".channel-identity h1")).toContainText(
    video.author,
  );
  await expect(page.locator(".channel-videos .video-card")).toHaveCount(1);
});

test("tools hub links to weather, maps, calendar and translation", async ({
  page,
}) => {
  await page.goto("/tools");
  await expect(
    page.getByRole("heading", { name: "Beyond the play button." }),
  ).toBeVisible();
  const tiles = page.locator(".tools-hub-grid > a");
  await expect(tiles).toHaveCount(4);
  expect(
    await tiles.evaluateAll((links) =>
      links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
    ),
  ).toEqual(["/weather", "/map", "/calendar", "/translate"]);
  await page.locator(".tool-tile-calendar").click();
  await expect(
    page.getByRole("heading", { name: "Good things are worth planning." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "All tools", exact: true }).click();
  await expect(page.locator(".tools-hub-grid")).toBeVisible();
  await page.locator(".tool-tile-translate").click();
  await expect(
    page.getByRole("heading", { name: "Good words travel." }),
  ).toBeVisible();
});

test("calendar stores an event across reload, navigates months and deletes the event", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-23T12:00:00Z"));
  await page.goto("/calendar");
  await expect(page.locator(".calendar-toolbar h2")).toHaveText("October 2026");
  const form = page.locator(".calendar-event-form");
  await form.getByLabel("What’s the plan?").fill("A little time for discovery");
  await form.getByLabel(/Time/).fill("14:30");
  await form
    .getByLabel(/A little note/)
    .fill("Take a break and watch something good.");
  await form.getByRole("button", { name: "blue event color" }).click();
  await form.getByRole("button", { name: "Save event" }).click();
  await expect(page.locator(".calendar-agenda-event strong")).toHaveText(
    "A little time for discovery",
  );
  await expect(page.locator(".calendar-agenda-event")).toContainText("14:30");
  await expect(page.locator(".calendar-save-notice")).toHaveText(
    "Event saved on this device.",
  );
  await page.reload();
  await expect(page.locator(".calendar-agenda-event strong")).toHaveText(
    "A little time for discovery",
  );
  await expect(page.locator(".calendar-agenda-event p")).toHaveText(
    "Take a break and watch something good.",
  );
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".calendar-toolbar h2")).toHaveText(
    "November 2026",
  );
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.locator(".calendar-toolbar h2")).toHaveText("October 2026");
  await page
    .getByRole("button", {
      name: "Delete A little time for discovery",
      exact: true,
    })
    .click();
  await expect(page.locator(".calendar-agenda-event")).toHaveCount(0);
  await expect(page.locator(".calendar-save-notice")).toHaveText(
    "Event removed.",
  );
  await page.reload();
  await expect(page.locator(".calendar-agenda-event")).toHaveCount(0);
  await expect(page.locator(".calendar-no-events")).toBeVisible();
});

test("map stays disconnected until explicit loading and searches only on submit", async ({
  page,
}) => {
  let mapRequests = 0;
  const placeQueries: string[] = [];
  await page.route("https://www.openstreetmap.org/**", async (route) => {
    mapRequests++;
    await route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><title>Map provider fixture</title><body>Interactive map fixture</body></html>',
    });
  });
  await page.route("**/api/places?**", async (route) => {
    placeQueries.push(
      new URL(route.request().url()).searchParams.get("q") || "",
    );
    await route.fulfill({
      json: {
        places: [
          {
            name: "Kyoto",
            displayName: "Kyoto, Japan",
            lat: 35.0116,
            lon: 135.7681,
            country: "Japan",
          },
        ],
      },
    });
  });
  await page.goto("/map");
  await expect(
    page.getByRole("button", { name: "Load interactive map" }),
  ).toBeVisible();
  await expect(page.locator(".map-canvas iframe")).toHaveCount(0);
  expect(mapRequests).toBe(0);
  await page.getByRole("textbox", { name: "Search for a place" }).fill("Kyoto");
  expect(placeQueries).toEqual([]);
  await page.getByRole("button", { name: "Find a place" }).click();
  await expect(page.locator(".map-location h2")).toHaveText("Kyoto");
  expect(placeQueries).toEqual(["Kyoto"]);
  await expect(page.locator(".map-canvas iframe")).toHaveCount(0);
  expect(mapRequests).toBe(0);
  await page.getByRole("button", { name: "Load interactive map" }).click();
  await expect(page.getByTitle("Interactive map of Kyoto")).toBeVisible();
  await expect(page.getByTitle("Interactive map of Kyoto")).toHaveAttribute(
    "src",
    /www\.openstreetmap\.org\/export\/embed\.html\?/,
  );
  await expect.poll(() => mapRequests).toBe(1);
  await page.getByRole("button", { name: "Unload map" }).click();
  await expect(page.locator(".map-canvas iframe")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Load interactive map" }),
  ).toBeVisible();
});

test("weather waits for a chosen location and renders provider results in either unit system", async ({
  page,
}) => {
  const weatherQueries: { q: string | null; units: string | null }[] = [];
  await page.route("**/api/weather?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const imperial = params.get("units") === "imperial";
    weatherQueries.push({ q: params.get("q"), units: params.get("units") });
    await route.fulfill({
      json: {
        location: {
          name: "Mumbai",
          displayName: "Mumbai, Maharashtra, India",
          lat: 19.076,
          lon: 72.8777,
          country: "India",
        },
        units: {
          temperature: imperial ? "°F" : "°C",
          windSpeed: imperial ? "mph" : "km/h",
        },
        current: {
          temperature: imperial ? 75 : 24,
          feelsLike: imperial ? 73 : 23,
          humidity: 65,
          windSpeed: imperial ? 7 : 12,
          precipitation: 0,
          isDay: true,
          weatherCode: 2,
          time: "2026-10-23T14:30",
        },
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: `2026-10-${23 + i}`,
          weatherCode: 2,
          min: imperial ? 68 : 20,
          max: imperial ? 79 : 26,
          sunrise: `2026-10-${23 + i}T06:30`,
          sunset: `2026-10-${23 + i}T18:15`,
        })),
      },
    });
  });
  await page.goto("/weather");
  await expect(
    page.getByRole("heading", { name: "What’s it like out there?" }),
  ).toBeVisible();
  await expect(page.locator(".weather-temperature")).toHaveCount(0);
  expect(weatherQueries).toEqual([]);
  await page.getByRole("textbox", { name: "City or place" }).fill("Mumbai");
  expect(weatherQueries).toEqual([]);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".weather-now h2")).toHaveText("Mumbai");
  await expect(page.locator(".weather-temperature")).toHaveText("24°C");
  await expect(page.locator(".weather-day")).toHaveCount(7);
  await expect(page.locator(".weather-now h3")).toHaveText("Partly cloudy");
  expect(weatherQueries).toEqual([{ q: "Mumbai", units: "metric" }]);
  await page.getByRole("button", { name: "°F", exact: true }).click();
  await expect(page.locator(".weather-temperature")).toHaveText("75°F");
  await expect(page.locator(".weather-details")).toContainText("mph");
  expect(weatherQueries).toEqual([
    { q: "Mumbai", units: "metric" },
    { q: "Mumbai", units: "imperial" },
  ]);
  await expect(
    page.getByRole("button", { name: "°F", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("translator waits for submit, renders translations and shows a failed provider without invented output", async ({
  page,
}) => {
  const queries: {
    from: string | null;
    to: string | null;
    text: string | null;
  }[] = [];
  await page.route("**/api/translate?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    queries.push({
      from: params.get("from"),
      to: params.get("to"),
      text: params.get("text"),
    });
    if (params.get("text") === "fail me") {
      await route.fulfill({
        status: 502,
        json: {
          error:
            "The translation service is currently unavailable. Please try again later.",
        },
      });
    } else
      await route.fulfill({
        json: {
          translated_text: "नमस्ते, जिज्ञासु दुनिया।",
          provider: "SimplyTranslate",
        },
      });
  });
  await page.goto("/translate");
  const source = page.getByRole("textbox", {
    name: "Text to translate",
    exact: true,
  });
  const result = page.getByRole("textbox", {
    name: "Translated text",
    exact: true,
  });
  await expect(result).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Translate", exact: true }),
  ).toBeDisabled();
  expect(queries).toEqual([]);
  await source.fill("Hello, curious world.");
  await page.getByRole("button", { name: "English → Hindi" }).click();
  expect(queries).toEqual([]);
  await page.getByRole("button", { name: "Translate", exact: true }).click();
  await expect(result).toHaveValue("नमस्ते, जिज्ञासु दुनिया।");
  expect(queries).toEqual([
    { from: "en", to: "hi", text: "Hello, curious world." },
  ]);
  await expect(
    page.getByRole("button", { name: "Copy translation" }),
  ).toBeEnabled();
  await source.fill("fail me");
  await expect(result).toHaveValue("");
  expect(queries).toHaveLength(1);
  await page.getByRole("button", { name: "Translate", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The translation service is currently unavailable. Please try again later.",
  );
  await expect(result).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  expect(queries).toHaveLength(2);
});
