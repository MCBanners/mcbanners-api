# v1 Readiness Audit

Audit date: 2026-05-16.

This document summarizes the current public API readiness posture for the Bun implementation. It is a release-supporting checklist, not a history log.

## Current Evidence

| Check                                               | Required status          |
| --------------------------------------------------- | ------------------------ |
| `bun run public:check`                              | pass                     |
| `bun run format`                                    | pass                     |
| `bun run check`                                     | pass                     |
| `docker build -t mcbanners-api-next:local .`        | pass                     |
| Local smoke against the built container             | pass before release      |
| Compatibility runner against a reachable legacy API | zero unexpected failures |

## Supported Public Routes

| Route family             | Pattern                                              | Formats | Notes                                  |
| ------------------------ | ---------------------------------------------------- | ------- | -------------------------------------- |
| Health                   | `GET /health`                                        | JSON    | Process liveness                       |
| Readiness                | `GET /ready`                                         | JSON    | Renderer assets and optional DB checks |
| Minecraft status         | `GET /mc/server?host=&port=`                         | JSON    | Cached                                 |
| Minecraft icon           | `GET /mc/icon?host=&port=`                           | PNG     | Cached                                 |
| Server banner            | `GET /banner/server/:host/:port/banner.png\|jpg`     | PNG/JPG | Cached                                 |
| Server banner validity   | `GET /banner/server/:host/:port/isValid`             | JSON    | Cached                                 |
| Resource banner          | `GET /banner/resource/:platform/:id/banner.png\|jpg` | PNG/JPG | Cached                                 |
| Resource banner validity | `GET /banner/resource/:platform/:id/isValid`         | JSON    | Cached                                 |
| Author banner            | `GET /banner/author/:platform/:id/banner.png\|jpg`   | PNG/JPG | Cached                                 |
| Author banner validity   | `GET /banner/author/:platform/:id/isValid`           | JSON    | Cached                                 |
| Member banner            | `GET /banner/member/:platform/:id/banner.png\|jpg`   | PNG/JPG | Cached                                 |
| Member banner validity   | `GET /banner/member/:platform/:id/isValid`           | JSON    | Cached                                 |
| Team banner              | `GET /banner/team/:platform/:id/banner.png\|jpg`     | PNG/JPG | Cached                                 |
| Team banner validity     | `GET /banner/team/:platform/:id/isValid`             | JSON    | Cached                                 |
| Saved banner create      | `POST /banner/saved/save`                            | JSON    | Requires DB                            |
| Saved banner recall      | `GET /banner/saved/:mnemonic.png\|jpg`               | PNG/JPG | Requires DB                            |

Supported resource, author, member, and team platforms: `spigot`, `modrinth`, `curseforge`, `hangar`, `ore`, `builtbybit`, and `polymart`.

Hangar resource IDs use `author/slug` two-segment IDs, for example `/banner/resource/hangar/papermc/eternal-light/banner.png`.

## Saved-Banner Behavior

When `DATABASE_URL` or the discrete `DB_*` variables are set, or when `SAVED_BANNER_DB_ENABLED=true`, saved banners are available:

- `POST /banner/saved/save` creates a banner and returns a mnemonic.
- `GET /banner/saved/:mnemonic.png|jpg` recalls and renders a saved banner.

When DB is not configured, saved-banner routes return `503 Service Unavailable` with a JSON error body. `/ready` reports the saved DB check as disabled.

All legacy `BannerType` ordinals are decoded. `DISCORD_USER` is intentionally unsupported in v1 and returns `501 Not Implemented` on saved recall.

## De-Scoped in v1

| Feature                         | Decision                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `DISCORD_USER` banner rendering | Not implemented in the v1 API.                                                          |
| Discord direct routes           | Not mounted. The Discord bot remains de-scoped.                                         |
| `apps/discord-bot`              | Excluded from the v1 API build and deployment path.                                     |
| `apps/bench-runner`             | Placeholder only and excluded from the v1 build.                                        |
| Pixel-perfect byte diffing      | Not a release gate; status, content type, and dimensions are the compatibility signals. |
| Redis or external cache         | In-process cache only for v1.                                                           |

## Environment Variables

| Variable                   | Required                                      | Default | Purpose                                           |
| -------------------------- | --------------------------------------------- | ------- | ------------------------------------------------- |
| `PORT`                     | no                                            | `3000`  | HTTP listen port                                  |
| `SAVED_BANNER_DB_ENABLED`  | no                                            | auto    | Force-enable or force-disable saved-banner DB     |
| `DATABASE_URL`             | if using saved banners                        | n/a     | MariaDB/MySQL connection URL                      |
| `DB_HOST`                  | if using saved banners without `DATABASE_URL` | n/a     | MariaDB host                                      |
| `DB_PORT`                  | no                                            | `3306`  | MariaDB port                                      |
| `DB_USER`                  | if using saved banners without `DATABASE_URL` | n/a     | MariaDB user                                      |
| `DB_PASSWORD`              | no                                            | n/a     | MariaDB password                                  |
| `DB_NAME`                  | if using saved banners without `DATABASE_URL` | n/a     | Database name                                     |
| `DB_SSL`                   | no                                            | `false` | Enable MariaDB TLS                                |
| `DB_POOL_CONNECTION_LIMIT` | no                                            | `10`    | Connection pool size                              |
| `BUILTBYBIT_API_KEY`       | no                                            | n/a     | BuiltByBit API key for live BuiltByBit coverage   |
| `RATE_LIMIT_ENABLED`       | no                                            | `false` | Enable in-process per-IP rate limiting            |
| `RATE_LIMIT_WINDOW_MS`     | no                                            | `60000` | Rate limit window duration                        |
| `RATE_LIMIT_MAX_REQUESTS`  | no                                            | `300`   | Max requests per IP per window                    |
| `METRICS_ENABLED`          | no                                            | `false` | Expose `GET /metrics`; keep private in production |

Do not commit `.env` files, database dumps, generated outputs, raw saved-banner rows, or logs.

## Docker Status

- Base image: `oven/bun:1.3.14`.
- Builder stage installs dependencies and runs typecheck, tests, and build.
- Runtime stage installs production dependencies, copies runtime source and assets, and runs as a non-root user.
- Saved-banner DB is optional and configured through runtime environment variables.

## Compatibility Notes

Image byte hashes do not need to match the legacy Java renderer. Known differences may come from font rasterization, JPEG encoding, color blending, and text measurement. Compatibility is verified through status code, content type, dimensions, route behavior, and successful image decoding.

Marketplace risks:

- BuiltByBit live coverage requires `BUILTBYBIT_API_KEY`.
- CurseForge may return asynchronous processing responses.
- Ore can require session authentication.
- Hangar uses slash-containing IDs.
- Logo fetch failures are non-fatal and should fall back to bundled assets.

## Release Gate

Before public release:

- [ ] `bun run public:check` passes
- [ ] `bun run format` passes
- [ ] `bun run check` passes
- [ ] `docker build -t mcbanners-api-next:local .` passes
- [ ] `bun run smoke:local -- --base-url <candidate-url>` passes
- [ ] Saved-banner create and recall are verified when DB is configured
- [ ] Logs contain no unexpected production errors or leaked sensitive data
- [ ] Previous image or legacy deployment path remains available for rollback
