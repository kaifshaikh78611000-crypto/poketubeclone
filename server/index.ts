import { createApp } from "./app.ts";
import { existsSync } from "node:fs";

// An optional blank platform setting must not hide a URL the user puts in .env.
// Nonempty injected configuration continues to take precedence.
if (existsSync(".env")) {
  if (!process.env.INVIDIOUS_API_URL?.trim())
    delete process.env.INVIDIOUS_API_URL;
  process.loadEnvFile(".env");
}

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT must be an integer from 1 to 65535.");
const app = createApp({ apiUrl: process.env.INVIDIOUS_API_URL });
const server = app.listen(port, "0.0.0.0", () => {
  console.log(
    `PokeTube API listening on port ${port} (${process.env.INVIDIOUS_API_URL ? "live backend" : "explicit demo catalogue"}).`,
  );
});
function close() {
  server.close(() => process.exit(0));
}
process.on("SIGTERM", close);
process.on("SIGINT", close);
