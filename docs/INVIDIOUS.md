# Host your own Invidious API

Poke uses Invidious for YouTube metadata and playback, alongside additional Poke services. This app connects to the public Invidious API contract through `INVIDIOUS_API_URL`.

Use a Linux VPS with Docker Engine and Docker Compose V2. Current official minimum requirements for Invidious plus Companion are 2 GB of free RAM and 20 GB of disk. For a public instance, the official recommendation is 4 GB RAM, 2 vCPU, at least 60 GB disk, and substantial network bandwidth/traffic allowance.

## 1. Install the production stack

Install [Docker Engine](https://docs.docker.com/engine/install/) and its [Compose plugin](https://docs.docker.com/compose/install/), then run on your server:

```bash
git clone https://github.com/iv-org/invidious.git
cd invidious
```

Replace the checkout's development `docker-compose.yml` with the **production Compose configuration** in the [official Invidious installation guide](https://docs.invidious.io/installation/#docker-compose-method-production). It runs three services: Invidious, PostgreSQL, and Invidious Companion. Companion is required for playback.

Generate two different keys on your server:

```bash
openssl rand -hex 32  # hmac_key
openssl rand -hex 8   # 16-character Companion key
```

Set the first key as Invidious's `hmac_key`. Set the second key in both `invidious_companion_key` and Companion's `SERVER_SECRET_KEY`; those two values must match and be exactly 16 characters. Also replace the example database password in both PostgreSQL and Invidious's database configuration. Keep these values on your server.

Leave Companion's optional `public_url` unset for this initial setup. The official `private_url: http://companion:8282/companion` lets Invidious proxy Companion through the same public hostname.

## 2. Configure a domain and HTTPS

Create a DNS record pointing a subdomain such as `inv.example.com` to your VPS. Inside the Compose file's `INVIDIOUS_CONFIG` block, set:

```yaml
domain: inv.example.com
https_only: true
external_port: 443
```

Keep the Compose port mapping `127.0.0.1:3000:3000`. Install a reverse proxy on the VPS, such as [Caddy](https://caddyserver.com/docs/install), and add a site block to its Caddyfile:

```caddyfile
inv.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Allow inbound ports 80 and 443 so Caddy can serve HTTPS and obtain a certificate. Start the stack and reload Caddy:

```bash
sudo docker compose up -d
sudo systemctl reload caddy
sudo docker compose ps
```

The API does not require an `api_enable` option. Keep `disable_abusable_api` at its default `false`, because enabling it disables video API endpoints.

## 3. Verify metadata and playback

```bash
curl --fail 'https://inv.example.com/api/v1/search?q=nature&type=video'
curl --fail 'https://inv.example.com/api/v1/videos/LXb3EKWsInQ?local=true'
```

Both requests must return usable JSON. Open an available video on the Invidious site and check that audio and video actually play. Metadata success alone does not prove playback. Playback availability also depends on YouTube accepting the server's IP and on current Invidious/Companion compatibility.

For diagnostics and updates, from the Invidious checkout:

```bash
sudo docker compose logs --tail=100 invidious companion
sudo docker compose pull
sudo docker compose up -d
```

Follow the official guide's post-install maintenance recommendations, including regular restarts and database backups.

## 4. Connect PokeTube Glass

In the **PokeTube Glass project root**, edit `.env`:

```dotenv
INVIDIOUS_API_URL=https://inv.example.com/api/v1
```

Restart `npm run dev`, or restart `npm start` in production. In a restricted cloud environment, allow your Invidious hostname and the thumbnail/media hosts it returns. No YouTube API key is needed. This app requests video metadata with `local=true` so returned native stream URLs route through your instance.

This guide documents deployment; it does not mean a VPS or live instance has already been provisioned. Official installation and configuration were checked while writing it.
