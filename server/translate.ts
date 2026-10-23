import { Router } from "express";
import { EnvHttpProxyAgent, fetch as proxyFetch } from "undici";

export interface TranslateOptions {
  fetchImpl?: (
    url: string,
    init?: { headers?: Record<string, string>; signal?: AbortSignal },
  ) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
    body?: { cancel: () => Promise<unknown> } | null;
  }>;
  timeoutMs?: number;
}

const languages = new Set([
  "auto",
  "en",
  "hi",
  "es",
  "fr",
  "de",
  "ja",
  "ko",
  "ar",
  "pt",
  "zh",
  "ru",
  "it",
  "bn",
  "ur",
  "tr",
  "nl",
  "ta",
  "te",
  "mr",
]);

/** A fixed translation provider: browser requests cannot choose an upstream destination. */
export function createTranslateRouter(options: TranslateOptions = {}) {
  const router = Router();
  const agent = options.fetchImpl ? undefined : new EnvHttpProxyAgent();
  const fetchImpl =
    options.fetchImpl ??
    ((url, init) => proxyFetch(url, { ...init, dispatcher: agent }));

  router.get("/translate", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const from = req.query.from === undefined ? "auto" : req.query.from;
    const to = req.query.to === undefined ? "en" : req.query.to;
    const text = req.query.text;
    if (
      typeof from !== "string" ||
      typeof to !== "string" ||
      !languages.has(from) ||
      !languages.has(to) ||
      to === "auto"
    ) {
      return res
        .status(400)
        .json({ error: "Choose supported source and target languages." });
    }
    if (typeof text !== "string" || !text.trim() || text.length > 3000) {
      return res
        .status(400)
        .json({ error: "Enter text between 1 and 3,000 characters." });
    }

    const url = new URL("https://simplytranslate.org/api/translate");
    url.search = new URLSearchParams({
      from,
      to,
      text,
      engine: "google",
    }).toString();
    try {
      const response = await fetchImpl(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": "PokeTubeGlass/1.0 (independent development UI)",
        },
        signal: AbortSignal.timeout(options.timeoutMs ?? 15_000),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if (response.status === 429)
          return res
            .status(429)
            .json({
              error:
                "The translation service is busy. Please wait a moment and try again.",
            });
        return res
          .status(502)
          .json({
            error:
              "The translation service is currently unavailable. Please try again later.",
          });
      }
      const data: unknown = await response.json();
      if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        typeof (data as { translated_text?: unknown }).translated_text !==
          "string"
      ) {
        return res
          .status(502)
          .json({
            error:
              "The translation service returned an unreadable result. Please try again.",
          });
      }
      const translated = (data as { translated_text: string }).translated_text;
      if (!translated.trim() || translated.length > 100_000) {
        return res
          .status(502)
          .json({
            error:
              "The translation service did not return a usable translation. Please try again.",
          });
      }
      return res.json({
        translated_text: translated,
        from,
        to,
        provider: "SimplyTranslate",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
      ) {
        return res
          .status(504)
          .json({
            error: "Translation took longer than expected. Please try again.",
          });
      }
      return res
        .status(502)
        .json({
          error:
            "The translation service could not be reached. Please try again later.",
        });
    }
  });

  return router;
}
