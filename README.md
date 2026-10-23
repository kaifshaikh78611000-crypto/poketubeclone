# PokeTube Glass

An original, responsive glassmorphism interface for discovering and watching videos through the public Invidious API contract. Built with React, TypeScript, Vite and Express. The design uses translucent surfaces, a muted sage accent, local imagery, light and dark themes, and mobile navigation.

This project started from an empty repository. It is an independent implementation: no application code, logos, screenshots or other assets were copied from PokeTube. The original Poke project informed the video workflows and API research. Its source is [available here](https://github.com/ashleyirispuppy143/poke).

## Run locally

Use **Node.js 24** and npm. Commands run from the repository root.

```sh
npm ci
npm run dev
```

Development runs Vite on port **5173** and the Express API on **3001**. Vite forwards `/api` requests to Express. The default is an explicitly labelled demonstration catalog; no backend credentials are needed to explore the interface. In a restricted cloud filesystem, use `npm ci --cache /tmp/poketube-npm-cache` if npm's default cache is not writable.

For a production build served by Express:

```sh
npm run build
npm start
```

Express serves the built SPA and API together on port **3001**, or the `PORT` environment variable. `npm start` expects `dist/` from the build; it does not build the frontend itself. Native player and clipboard features may need HTTPS in a deployed browser.

## Connect a live video service

See [Host your own Invidious API](docs/INVIDIOUS.md) for the production Docker, Companion, HTTPS, and app connection steps.

Operate an Invidious instance, including its playback requirements, or use one you have permission to access. Follow the [official installation documentation](https://docs.invidious.io/installation/). PokeTube's official shared `invid-api.poketube.fun` service explicitly requires custom instances to use their own backend; this application rejects that shared hostname rather than bypassing its restrictions.

**Insert API here: `.env`, setting `INVIDIOUS_API_URL`.** The local `.env` has been created with this value deliberately blank. The committed `.env.example` also includes the marker. On a fresh clone, create local configuration from the example:

```sh
cp .env.example .env
```

Set this value in `.env`, or inject it through your hosting environment, then restart the API process:

```dotenv
INVIDIOUS_API_URL=https://your-invidious-instance.example/api/v1
PORT=3001
```

Node 24 loads `.env` at server startup. Nonempty injected video API settings take precedence; an empty optional platform setting still allows the URL in `.env` to work. `.env` is ignored by Git. The API base URL must not contain embedded credentials, query parameters or fragments. **Do not put secrets in React/Vite configuration or client code.** This application does not require or expose a YouTube API key.

The server adapts standard Invidious endpoints for trending feeds, search, suggestions, video metadata, channels, comments and playlists. It normalizes their payloads for the frontend; it is not a general-purpose proxy or a complete reimplementation of every Invidious endpoint. Server requests respect the environment's HTTP/HTTPS proxy configuration and retain TLS verification. Allow the chosen backend hostname in your environment's network settings, together with the image and media hosts required by its responses. Browser playback and remote images need access from the user's browser too.

`GET /api/status` reports whether a backend is **configured**. It does not probe the upstream service and is not proof of connectivity. Verify a real feed request, search and native video playback after configuring your instance. No dedicated live video backend was supplied for verification. The original `poketube.fun/home` page was successfully inspected after its domain was allowed; its shared backend is not used by this project. Tests use deterministic local fixtures and do not establish live service availability.

## Features and boundaries

- Browse themed feeds, search with suggestions and sorting, open video and channel pages, and recover from loading, empty and error states.
- Use the native player when the configured backend supplies a supported muxed audio/video stream. Playback depends on the backend and browser codecs. Separate adaptive video/audio formats are not silently presented as complete playable streams.
- Explicitly choose an external YouTube player when needed. This contacts YouTube and is not equivalent to privacy-preserving playback through Invidious. External embed availability, advertising, geographic restrictions and browser policies are outside this app's control. Native-player autoplay preferences do not control the external embed.
- Save watch later, likes, history, channel subscriptions, personal playlists and appearance preferences in this browser's local storage. Export the collection as JSON in Settings. These are local collections, not upstream account actions; no login, cross-device account sync or shared user database is implemented.
- Use light/dark appearance and reduced-motion preferences. Settings accurately distinguish demonstration mode from a configured live catalog.
- Open weather, maps, a local personal calendar and translation tools from the Tools area. Weather and location searches contact public providers on submission; the interactive map loads only when chosen. Calendar events stay in this browser.
- Translate between supported languages through SimplyTranslate, with language swapping, a 3,000-character input limit and output copying. No translation request runs while typing or changing languages.
- Open YouTube's own upload page through the external upload action. This application does not host uploaded videos.

This is an independent implementation, not a claim of complete parity with every Poke service. Original-site account APIs, federated social services, upload hosting, downloads and synchronized adaptive playback are not reproduced. The design intentionally differs from the original website.

## Tool providers

The auxiliary tools do not need API keys. Their availability depends on the external provider and your environment's network policy:

| Tool            | Provider / allowed hostname                    | Behavior                                                                                        |
| --------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Weather         | `api.open-meteo.com`                           | Forecast requested for the selected location.                                                   |
| Place search    | `nominatim.openstreetmap.org`                  | Submitted city/place searches; requests are queued and cached.                                  |
| Interactive map | `www.openstreetmap.org` and its map tile hosts | Browser embed loaded only after the user chooses to load the map.                               |
| Translation     | `simplytranslate.org`                          | Submitted text is forwarded to the provider's `/api/translate` endpoint with its Google engine. |
| Calendar        | None                                           | Events persist in this browser; there is no remote calendar account or sync.                    |

The translation route is `GET /api/translate?from=auto&to=en&text=...`. It validates language choices and input length, uses a fixed provider URL, retains proxy/TLS settings, and returns failures rather than invented translations. A live check of SimplyTranslate during development returned **HTTP 500**; the local integration handles that outage, but successful live translation remains unverified. The provider receives the submitted text. Library JSON exports currently cover video collections and preferences, not calendar events.

## Demonstration data and assets

The offline catalog contains illustrative titles, counts, dates, subscriber numbers and thematic artwork. They are **not current or verified upstream metadata**. Demo thumbnails are stock/example artwork rather than verified thumbnails for the referenced videos. The decorative hero is not a video still. When an external demo player is opened, it requests the referenced public YouTube video; availability is not guaranteed.

Photograph, font and source-license details are in [public/ASSET_CREDITS.md](public/ASSET_CREDITS.md), with retained license files under `public/asset-licenses/`. Live images are supplied by the configured service.

## Validation

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The API tests exercise local fixtures, upstream normalization, query forwarding and failure handling without requiring public services. Browser tests exercise discovery, search, watch pages, persistent library actions, channel subscriptions, settings and responsive navigation. Browser tests expect demonstration mode: run without a configured `INVIDIOUS_API_URL` and without a live value in `.env`.

Playwright starts the development servers when needed and can reuse running servers. The cloud image provides `/usr/bin/chromium`, which the test configuration detects. On another machine, install Playwright's Chromium first:

```sh
npx playwright install chromium
```

Test failures retain browser traces and screenshots under the ignored test output directories. A passing fixture/browser suite demonstrates local application behavior, not the availability of an external backend or YouTube playback.
