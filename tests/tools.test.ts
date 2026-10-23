import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { test } from "node:test";
import express from "express";
import { createToolsRouter } from "../server/tools.ts";
async function start(server: Server) {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  return `http://127.0.0.1:${address.port}`;
}
async function stop(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
test("tools reject invalid searches, coordinates and units without contacting providers", async () => {
  let requests = 0;
  const app = express();
  app.use(
    "/api",
    createToolsRouter({
      fetchImpl: async () => {
        requests++;
        throw new Error("Should not request");
      },
      geocodeIntervalMs: 0,
    }),
  );
  const server = createServer(app);
  const base = await start(server);
  try {
    for (const path of [
      "/places?q=a",
      "/places?q[]=London",
      "/weather?q=London&units=kelvin",
      "/weather?lat=91&lon=0",
      "/weather?lat=0",
      "/weather?lat=&lon=0",
    ]) {
      const response = await fetch(`${base}/api${path}`);
      assert.equal(response.status, 400, path);
      assert.equal(typeof (await response.json()).error, "string");
    }
    assert.equal(requests, 0);
  } finally {
    await stop(server);
  }
});
test("place search is explicit, cached, and includes required provider identification", async () => {
  const calls: { url: string; headers?: Record<string, string> }[] = [];
  const app = express();
  app.use(
    "/api",
    createToolsRouter({
      fetchImpl: async (url, init) => {
        calls.push({ url, headers: init?.headers });
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              name: "London",
              display_name: "London, England, UK",
              lat: "51.5074",
              lon: "-0.1278",
              address: { country: "United Kingdom" },
            },
          ],
        };
      },
      geocodeIntervalMs: 0,
    }),
  );
  const server = createServer(app);
  const base = await start(server);
  try {
    for (const query of ["London", "london"]) {
      const response = await fetch(`${base}/api/places?q=${query}`);
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.places[0].lat, 51.5074);
      assert.equal(data.places[0].name, "London");
      assert.match(data.attribution, /OpenStreetMap/);
    }
    assert.equal(calls.length, 1);
    const url = new URL(calls[0].url);
    assert.equal(url.hostname, "nominatim.openstreetmap.org");
    assert.equal(url.searchParams.get("limit"), "1");
    assert.match(calls[0].headers?.["User-Agent"] || "", /PokeTubeGlass/);
  } finally {
    await stop(server);
  }
});
test("weather requests correct units and normalizes real provider fields without fabricating data", async () => {
  const calls: URL[] = [];
  const app = express();
  app.use(
    "/api",
    createToolsRouter({
      fetchImpl: async (url) => {
        const parsed = new URL(url);
        calls.push(parsed);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            current: {
              temperature_2m: 77,
              apparent_temperature: 78,
              relative_humidity_2m: 45,
              weather_code: 0,
              wind_speed_10m: 4,
              precipitation: 0,
              is_day: 1,
              time: "2026-10-23T15:00",
            },
            daily: {
              time: ["2026-10-23"],
              weather_code: [0],
              temperature_2m_max: [79],
              temperature_2m_min: [64],
              sunrise: ["2026-10-23T07:00"],
              sunset: ["2026-10-23T18:00"],
            },
          }),
        };
      },
    }),
  );
  const server = createServer(app);
  const base = await start(server);
  try {
    const url = `${base}/api/weather?lat=19.07&lon=72.87&name=Mumbai&units=imperial`;
    const response = await fetch(url);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.current.temperature, 77);
    assert.equal(data.current.isDay, true);
    assert.equal(data.units.temperature, "°F");
    assert.equal(data.units.windSpeed, "mph");
    assert.equal(data.location.name, "Mumbai");
    assert.equal(data.daily[0].max, 79);
    assert.equal(calls[0].hostname, "api.open-meteo.com");
    assert.equal(calls[0].searchParams.get("temperature_unit"), "fahrenheit");
    assert.equal(calls[0].searchParams.get("wind_speed_unit"), "mph");
    await fetch(url);
    assert.equal(
      calls.length,
      1,
      "repeated weather requests use the current-data cache",
    );
  } finally {
    await stop(server);
  }
});
test("provider failures and malformed current weather return explicit errors", async () => {
  for (const reply of [
    { ok: false, status: 403, json: async () => ({}) },
    { ok: true, status: 200, json: async () => ({ current: {}, daily: {} }) },
  ]) {
    const app = express();
    app.use("/api", createToolsRouter({ fetchImpl: async () => reply }));
    const server = createServer(app);
    const base = await start(server);
    try {
      const response = await fetch(`${base}/api/weather?lat=1&lon=2`);
      assert.equal(response.status, 502);
      const data = await response.json();
      assert.equal(typeof data.error, "string");
      assert.equal(data.current, undefined);
    } finally {
      await stop(server);
    }
  }
});
