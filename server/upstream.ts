import { EnvHttpProxyAgent, fetch as proxyFetch } from "undici";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function validateApiUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("INVIDIOUS_API_URL must be a complete HTTP or HTTPS URL.");
  }
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("INVIDIOUS_API_URL must use HTTP or HTTPS.");
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "INVIDIOUS_API_URL must not include credentials, a query, or a fragment.",
    );
  if (
    url.hostname === "invid-api.poketube.fun" ||
    url.hostname.endsWith(".invid-api.poketube.fun")
  ) {
    throw new Error(
      "PokeTube requires custom instances to use their own Invidious backend. Configure your own INVIDIOUS_API_URL.",
    );
  }
  if (url.pathname === "/" || url.pathname === "") url.pathname = "/api/v1";
  return url.toString().replace(/\/+$/, "");
}

export function makeUpstream(
  apiUrl: string,
  timeoutMs = 15000,
  useProxy = true,
) {
  const base = validateApiUrl(apiUrl);
  const proxyAgent =
    useProxy &&
    (process.env.HTTPS_PROXY ||
      process.env.HTTP_PROXY ||
      process.env.https_proxy ||
      process.env.http_proxy)
      ? new EnvHttpProxyAgent()
      : undefined;
  return async function upstream(
    path: string,
    parameters: Record<string, string | number | undefined> = {},
  ): Promise<unknown> {
    // Only server-defined paths and URLSearchParams are accepted; no user-controlled target URLs.
    if (!path.startsWith("/") || path.startsWith("//") || path.includes(".."))
      throw new ApiError(400, "Invalid upstream resource.");
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(parameters))
      if (value !== undefined && value !== "")
        url.searchParams.set(key, String(value));
    try {
      const response = await proxyFetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "PokeTube-Glass/1.0",
        },
        signal: AbortSignal.timeout(timeoutMs),
        ...(proxyAgent ? { dispatcher: proxyAgent } : {}),
        redirect: "error",
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 404)
          throw new ApiError(
            404,
            "This item was not found by the video backend.",
          );
        if (response.status === 429)
          throw new ApiError(
            429,
            "The video backend is busy. Please try again shortly.",
          );
        throw new ApiError(
          502,
          `The video backend returned HTTP ${response.status}. Check your Invidious instance.`,
        );
      }
      const body = await response.text();
      if (body.length > 8_000_000)
        throw new ApiError(
          502,
          "The video backend returned an oversized response.",
        );
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new ApiError(
          502,
          "The video backend returned an invalid JSON response.",
        );
      }
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        typeof (parsed as { error?: unknown }).error === "string"
      ) {
        throw new ApiError(
          502,
          "The video backend could not complete this request.",
        );
      }
      return parsed;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (
        error instanceof Error &&
        ["TimeoutError", "AbortError"].includes(error.name)
      )
        throw new ApiError(
          504,
          "The video backend took too long to respond. Please try again.",
        );
      throw new ApiError(
        502,
        "The video backend could not be reached. Check INVIDIOUS_API_URL and network access.",
      );
    }
  };
}
