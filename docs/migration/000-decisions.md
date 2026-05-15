# 000 Decisions

## Scope

Milestone 1 creates the Bun + TypeScript monorepo scaffold only. It does not port renderer logic, upstream clients, storage access, API routes, or Discord runtime behavior.

## Monorepo shape

- `apps/api`: future consolidated HTTP API for `banner-api` and `mc-api`.
- `apps/discord-bot`: separate Discord bot process in the same monorepo.
- `apps/compat-runner`: future compatibility snapshot and smoke runner.
- `apps/bench-runner`: future rendering/API benchmark runner.
- `packages/banner-renderer`: future renderer package.
- `packages/domain`: compatibility contracts and shared domain types.
- `packages/external-clients`: future service clients for Spigot, Ore, CurseForge, Modrinth, BuiltByBit, Polymart, Hangar, and Discord.
- `packages/minecraft-status`: future Minecraft ping/status implementation.
- `packages/db`: future Kysely database layer.
- `packages/cache`: future cache abstractions.
- `packages/config`: future runtime configuration parsing.
- `packages/logger`: shared Pino logger.

## Compatibility decisions

- Existing public `/banner/*` URLs remain first-class.
- Existing public `/mc/*` URLs remain first-class.
- The website remains a separate repo and is not migrated here.
- Saved banner mnemonics must continue to resolve.
- `saved_banner.type` stores Java enum ordinals, so `BannerType` order is a DB compatibility boundary.
- Settings remain `namespace__query_key` compatible.
- `png` and `jpg` output aliases stay supported.
- Renderer work will target `@napi-rs/canvas` first. Bun image tooling may support file/image pipeline tasks, but it is not the primary renderer.

## Legacy source references

The legacy repos are read-only references:

- `../banner-api`
- `../mc-api`
- `../discord-api`
