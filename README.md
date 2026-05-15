# MCBanners API Next

Compatibility-first Bun + TypeScript monorepo for the next MCBanners backend.

This repo is the future home for a consolidated API that will eventually replace the legacy `banner-api` and `mc-api` services while keeping the Discord bot as a separate app/process. Milestone 1 is scaffold and compatibility contracts only; it does not implement API routes, rendering, database access, or external service clients.

## Repo Layout

- `apps/api`: future HTTP API.
- `apps/discord-bot`: future Discord bot process.
- `apps/compat-runner`: future compatibility runner.
- `apps/bench-runner`: future benchmark runner.
- `packages/banner-renderer`: future renderer package.
- `packages/domain`: shared domain contracts and compatibility manifest.
- `packages/external-clients`: future upstream service clients.
- `packages/minecraft-status`: future Minecraft status package.
- `packages/db`: future database layer.
- `packages/cache`: future cache layer.
- `packages/config`: future config parsing.
- `packages/logger`: shared logging.
- `docs/migration`: migration decisions and compatibility policy.

## Commands

```powershell
bun install --frozen-lockfile
bun run dev
bun run build
bun run test
bun run test:compat
bun run test:visual
bun run test:integration
bun run typecheck
bun run lint
bun run format
bun run check
```

## Compatibility Warning

Existing public banner URLs, saved banner mnemonic URLs, Java `BannerType` ordinals, `namespace__query_key` settings, `png`/`jpg` output behavior, and `/banner/*` plus `/mc/*` route families are compatibility boundaries. Treat `packages/domain/src/compatibility/manifest.ts` as the Milestone 1 contract.

## Legacy Repos Are Read-Only

The sibling repos are compatibility references only:

- `../banner-api`
- `../mc-api`
- `../discord-api`

Do not modify them from this repo.

