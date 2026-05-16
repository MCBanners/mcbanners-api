# MCBanners API Next

Bun + TypeScript implementation of the MCBanners HTTP API. The project is built around compatibility with existing public banner URLs while moving rendering, Minecraft status checks, external marketplace clients, caching, and saved-banner persistence into a typed monorepo.

## Stack

- Runtime: Bun 1.3.x
- Language: TypeScript
- HTTP framework: Hono
- Database access: Kysely with optional MariaDB for saved banners
- Logging: pino
- Validation: zod
- Container target: self-hosted Docker image

## Repository Layout

- `apps/api`: active HTTP API.
- `apps/compat-runner`: compatibility runner for comparing API output.
- `apps/bench-runner`: placeholder for future benchmark tooling; excluded from the v1 build.
- `apps/discord-bot`: de-scoped from the v1 API repository readiness target.
- `packages/banner-renderer`: banner image rendering and assets.
- `packages/cache`: cache interfaces and implementations.
- `packages/config`: environment and runtime configuration.
- `packages/db`: saved-banner database access.
- `packages/domain`: public route contracts, compatibility metadata, and shared domain types.
- `packages/external-clients`: upstream marketplace clients.
- `packages/logger`: logging utilities.
- `packages/minecraft-status`: Minecraft server status lookup.
- `docs/deployment`: current deployment, staging, release, and public-readiness notes.
- `docs/migration`: historical migration reference only.

## Requirements

- Bun matching `packageManager` in `package.json`
- Docker, only for container builds or smoke tests
- MariaDB, only when enabling saved-banner persistence

## Configuration

Copy `.env.example` for local development and fill in environment-specific values. Do not commit real `.env` files, database dumps, generated output, local logs, or validation artifacts.

Important variables:

- `PORT`: HTTP port, default `3000`.
- `SAVED_BANNER_DB_ENABLED`: enables saved-banner database-backed routes.
- `DATABASE_URL`: MariaDB URL used when saved-banner persistence is enabled.
- `BUILTBYBIT_API_KEY`: optional upstream API key for BuiltByBit lookups.
- `RATE_LIMIT_ENABLED`: enables API rate limiting when configured.
- `CACHE_ENABLED`: enables cache backends when configured.

See `.env.example` and `docs/deployment/docker.md` for the full local/container surface.

## Commands

```powershell
bun install --frozen-lockfile
bun run dev
bun run check
```

Useful targeted commands:

```powershell
bun run build
bun run test
bun run test:compat
bun run test:integration
bun run format
bun run public:check
```

Docker:

```powershell
bun run docker:build
bun run docker:run
bun run docker:smoke
```

## Public API Compatibility

The v1 API preserves the established `/banner/*`, `/banner/saved/*`, and `/mc/*` route families. Saved-banner creation uses `POST /banner/saved/save`; saved-banner recall uses `/banner/saved/{mnemonic}.{format}`.

Compatibility-sensitive areas include:

- Java `BannerType` ordinal mapping.
- `namespace__query_key` settings names.
- `png` and `jpg` output behavior.
- Existing saved-banner mnemonic recall URLs.
- Browser image/embed usage through direct banner image URLs.

Treat `packages/domain/src/compatibility/manifest.ts` as the compatibility contract before changing public routes or query parameter behavior.

## Public Repository Hygiene

Run this before publishing or cutting a release:

```powershell
bun run public:check
bun run format
bun run check
docker build -t mcbanners-api-next:local .
```

The public-readiness check rejects tracked output directories, SQL dumps, zip archives, `.env` files, logs, local Windows profile paths, private IP literals, and known raw saved-banner corpus fields.

## Documentation

Current operational docs live in `docs/deployment`.

Migration notes in `docs/migration` are historical reference material. They document decisions made while porting from the legacy services and are not a current setup guide.

## Security

See `SECURITY.md` for reporting guidance. Do not include secrets, private database URLs, raw saved-banner rows, mnemonics, or production dumps in public issues or pull requests.

## License

MIT. See `LICENSE`.
