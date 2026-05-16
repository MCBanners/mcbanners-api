# Docker Deployment

MCBanners API Next is deployed as a self-hosted Bun container. The container runs only the Bun API process; the website and Discord bot remain separate.

## Image Strategy

- Base image: `oven/bun:1.3.14`, matching the pinned root `packageManager`.
- The image intentionally uses the standard glibc-based Bun image instead of Alpine to reduce native canvas binding risk.
- Builder stage installs dependencies with `bun install --frozen-lockfile`.
- Builder stage runs `bun run typecheck`, `bun run test`, and `bun run build`.
- Runtime stage installs production dependencies from the lockfile.
- Runtime stage copies only API source, package source, renderer assets, package manifests, `bun.lock`, and `bunfig.toml`.
- Runtime process runs as the non-root `mcbanners` user.

## Required Environment

`PORT` is optional and defaults to `3000`. The Docker image exposes `3000`.

No database is required for normal banner rendering. If saved-banner persistence is disabled or not configured, `/banner/saved/*` remains unavailable and `/ready` reports the saved DB check as `disabled`.

## Optional Environment

Saved-banner MariaDB wiring:

- `SAVED_BANNER_DB_ENABLED`: boolean-like flag. Use `true` to require DB config, `false` to force-disable.
- `DATABASE_URL`: MariaDB/MySQL connection URL.
- `DB_HOST`: MariaDB host when not using `DATABASE_URL`.
- `DB_PORT`: MariaDB port, defaults to `3306`.
- `DB_USER`: MariaDB user.
- `DB_PASSWORD`: MariaDB password.
- `DB_NAME`: database name.
- `DB_SSL`: boolean-like flag, defaults to `false`.
- `DB_POOL_CONNECTION_LIMIT`: pool size, defaults to `10`.

Marketplace clients:

- `BUILTBYBIT_API_KEY`: optional BuiltByBit API key. Do not log or bake it into the image.

Cache behavior is currently in-process memory cache with fixed runtime defaults:

- Minecraft status cache: 30 seconds.
- Rendered banner image caches: 60 seconds.
- Marketplace author/member/team lookup caches: 30 seconds.

## Health And Readiness

- `GET /health` returns `200` when the process is alive.
- `GET /ready` validates renderer assets and checks MariaDB only when the saved-banner DB is configured.
- Readiness responses expose only dependency status names and do not include connection strings, API keys, passwords, or raw error messages.

Readiness returns:

- `200` when renderer assets validate and every configured dependency is available.
- `503` when renderer assets fail validation or a configured saved-banner DB check fails.

## Build And Run

```powershell
bun install --frozen-lockfile
bun run check
bun run docker:build
bun run docker:run
```

Smoke check from another shell:

```powershell
bun run docker:smoke
bun run smoke:local
Invoke-WebRequest http://localhost:3000/ready
```

The fuller smoke script writes downloaded image responses under `output/smoke-local-api`, which is ignored by git.

## Tested Local Flow

The current expected local release flow is:

```powershell
bun install --frozen-lockfile
bun run check
docker build -t mcbanners-api-next:local .
docker run --rm -p 3000:3000 --env PORT=3000 mcbanners-api-next:local
bun run smoke:local
```

The smoke script checks `/health`, `/ready`, Minecraft status/icon, a server
banner, Modrinth Sodium, and the documented Spigot EssentialsX fixture. The
Spigot fixture uses resource ID `9089`, which is known to return `image/png`
from the legacy Java production API at
`/banner/resource/spigot/9089/banner.png`.

## Troubleshooting

### Frozen Runtime Lockfile

If the runtime stage fails with `lockfile had changes, but lockfile is frozen`, do not remove `--frozen-lockfile`.

Check these first:

- Every workspace package used at runtime declares its own runtime dependencies.
- `bun.lock` includes the current dependency edges from all workspace `package.json` files.
- The Docker runtime stage copies every workspace `package.json` before `bun install --frozen-lockfile --production`.
- The runtime stage does not expose a different workspace graph than the lockfile was generated from.

To reproduce outside Docker, create a temp directory with root `package.json`, `bun.lock`, `bunfig.toml`, and every workspace `package.json`, then run:

```powershell
bun install --frozen-lockfile --production
```

### Native Canvas

`@napi-rs/canvas` is a native dependency used by the renderer. The Dockerfile uses the standard glibc-based `oven/bun:1.3.14` image instead of Alpine to reduce native binding risk. If image rendering fails only in Docker, check the canvas package install, Linux native binary support, and renderer asset readiness before changing API behavior.

## Production Notes

- Review `bun.lock` before deployment after dependency updates.
- Do not mount or copy local `node_modules` into the image.
- Do not commit `.env` files or secrets.
- Keep `../banner-api`, `../mc-api`, and `../discord-api` outside the image. They are compatibility references only.
- The container is self-hosted Bun. Do not pivot this service to Cloudflare Workers without a separate compatibility review.
