import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import express from "express";
import {
  createTranslateRouter,
  type TranslateOptions,
} from "../server/translate.ts";

async function withRouter(
  options: TranslateOptions,
  run: (origin: string) => Promise<void>,
) {
  const app = express();
  app.use("/api", createTranslateRouter(options));
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

const query = (text: string, from = "auto", to = "en") =>
  new URLSearchParams({ text, from, to }).toString();

test("translation forwards exact Unicode text to the fixed SimplyTranslate provider", async () => {
  const text = "Hello & नमस्ते\nHow are you?";
  const calls: string[] = [];
  await withRouter(
    {
      fetchImpl: async (url, init) => {
        calls.push(url);
        assert.equal(init?.headers?.Accept, "application/json");
        assert(init?.signal instanceof AbortSignal);
        return {
          ok: true,
          status: 200,
          json: async () => ({ translated_text: "नमस्ते\nआप कैसे हैं?" }),
        };
      },
    },
    async (origin) => {
      const response = await fetch(
        `${origin}/api/translate?${query(text, "en", "hi")}&url=https://unrelated.invalid/`,
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), {
        translated_text: "नमस्ते\nआप कैसे हैं?",
        from: "en",
        to: "hi",
        provider: "SimplyTranslate",
      });
    },
  );
  assert.equal(calls.length, 1);
  const destination = new URL(calls[0]);
  assert.equal(destination.origin, "https://simplytranslate.org");
  assert.equal(destination.pathname, "/api/translate");
  assert.equal(destination.searchParams.get("engine"), "google");
  assert.equal(destination.searchParams.get("from"), "en");
  assert.equal(destination.searchParams.get("to"), "hi");
  assert.equal(destination.searchParams.get("text"), text);
});

test("translation rejects invalid input before contacting the provider", async () => {
  let calls = 0;
  await withRouter(
    {
      fetchImpl: async () => {
        calls++;
        return {
          ok: true,
          status: 200,
          json: async () => ({ translated_text: "Unexpected" }),
        };
      },
    },
    async (origin) => {
      for (const invalidQuery of [
        "from=auto&to=en",
        query(""),
        query("  \n\t"),
        query("a".repeat(3001)),
        query("Hello", "unsupported", "en"),
        query("Hello", "en", "auto"),
        query("Hello", "en", "https://arbitrary.invalid/"),
        "from=en&from=de&to=hi&text=Hello",
        "from=en&to=hi&text=Hello&text=Other",
      ]) {
        const response = await fetch(`${origin}/api/translate?${invalidQuery}`);
        assert.equal(response.status, 400);
        assert.equal(typeof (await response.json()).error, "string");
      }
    },
  );
  assert.equal(calls, 0);
});

test("translation accepts the 3,000-character boundary without silently truncating it", async () => {
  const text = "x".repeat(3000);
  let forwarded = "";
  await withRouter(
    {
      fetchImpl: async (url) => {
        forwarded = new URL(url).searchParams.get("text") || "";
        return {
          ok: true,
          status: 200,
          json: async () => ({ translated_text: "A real provider result" }),
        };
      },
    },
    async (origin) => {
      const response = await fetch(`${origin}/api/translate?${query(text)}`);
      assert.equal(response.status, 200);
      await response.json();
    },
  );
  assert.equal(forwarded, text);
});

test("translation defaults to auto-detect and English when languages are omitted", async () => {
  let destination: URL | undefined;
  await withRouter(
    {
      fetchImpl: async (url) => {
        destination = new URL(url);
        return {
          ok: true,
          status: 200,
          json: async () => ({ translated_text: "Hello" }),
        };
      },
    },
    async (origin) => {
      const response = await fetch(`${origin}/api/translate?text=Hola`);
      assert.equal(response.status, 200);
      await response.json();
    },
  );
  assert.equal(destination?.searchParams.get("from"), "auto");
  assert.equal(destination?.searchParams.get("to"), "en");
});

test("translation reports provider rate limits and outages instead of fabricating results", async () => {
  for (const [providerStatus, expectedStatus] of [
    [429, 429],
    [500, 502],
    [403, 502],
  ]) {
    let cancelled = false;
    await withRouter(
      {
        fetchImpl: async () => ({
          ok: false,
          status: providerStatus,
          json: async () => ({}),
          body: {
            cancel: async () => {
              cancelled = true;
            },
          },
        }),
      },
      async (origin) => {
        const response = await fetch(
          `${origin}/api/translate?${query("Hola")}`,
        );
        assert.equal(response.status, expectedStatus);
        const data = await response.json();
        assert.equal(typeof data.error, "string");
        assert.equal(data.translated_text, undefined);
      },
    );
    assert(cancelled, "Failed upstream bodies should be cancelled");
  }
});

test("translation validates upstream output rather than returning malformed or blank translations", async () => {
  for (const result of [
    null,
    [],
    { translated_text: 12 },
    { translated_text: "" },
    { translated_text: " \n" },
    { translated_text: "x".repeat(100_001) },
  ]) {
    await withRouter(
      {
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => result,
        }),
      },
      async (origin) => {
        const response = await fetch(
          `${origin}/api/translate?${query("Hola")}`,
        );
        assert.equal(response.status, 502);
        const data = await response.json();
        assert.equal(typeof data.error, "string");
        assert.equal(data.translated_text, undefined);
      },
    );
  }
});

test("translation times out slow providers and returns a retryable error", async () => {
  await withRouter(
    {
      timeoutMs: 15,
      fetchImpl: async (_url, init) =>
        new Promise((_resolve, reject) => {
          assert(init?.signal);
          init.signal.addEventListener(
            "abort",
            () => reject(init.signal!.reason),
            { once: true },
          );
        }),
    },
    async (origin) => {
      const response = await fetch(`${origin}/api/translate?${query("Hola")}`);
      assert.equal(response.status, 504);
      const data = await response.json();
      assert.match(data.error, /longer than expected/);
      assert.equal(data.translated_text, undefined);
    },
  );
});

test("translation handles malformed JSON and network failure without exposing internal error text", async () => {
  for (const fetchImpl of [
    async () => {
      throw new Error("Internal network diagnosis must stay private");
    },
    async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError("Unexpected upstream document");
      },
    }),
  ]) {
    await withRouter({ fetchImpl }, async (origin) => {
      const response = await fetch(`${origin}/api/translate?${query("Hola")}`);
      assert.equal(response.status, 502);
      const data = await response.json();
      assert.equal(typeof data.error, "string");
      assert.doesNotMatch(
        data.error,
        /Internal network diagnosis|Unexpected upstream document/,
      );
      assert.equal(data.translated_text, undefined);
    });
  }
});
