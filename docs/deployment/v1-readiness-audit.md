# v1 Readiness Audit

Audit date: 2026-05-16. Reflects test suite at commit `77c3fa1` (M25 complete, M26 hardening). Updated for M27 (production observability and edge-safety hardening).

## Current Evidence

| Check                                          | Status                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `bun run check` (typecheck + lint + 751 tests) | ✅ pass                                                             |
| Docker build (builder + runtime stage)         | ✅ pass                                                             |
| Docker smoke (`/health`, `/ready`)             | ✅ pass                                                             |
| Compat-runner against prod Java                | 5/5 enabled passed, 1 skipped, 3 candidate improvements, 0 failures |

## Supported Public Routes

| Route family             | Pattern                                              | Formats | Notes                                               |
| ------------------------ | ---------------------------------------------------- | ------- | --------------------------------------------------- |
| Health                   | `GET /health`                                        | JSON    | Always 200 when alive                               |
| Readiness                | `GET /ready`                                         | JSON    | 200 or 503; validates renderer assets + optional DB |
| Minecraft status         | `GET /mc/server?host=&port=`                         | JSON    | 30 s cache                                          |
| Minecraft icon           | `GET /mc/icon?host=&port=`                           | PNG     | 30 s cache                                          |
| Server banner            | `GET /banner/server/:host/:port/banner.png\|jpg`     | PNG/JPG | 60 s cache                                          |
| Server banner validity   | `GET /banner/server/:host/:port/isValid`             | JSON    | 30 s cache                                          |
| Resource banner          | `GET /banner/resource/:platform/:id/banner.png\|jpg` | PNG/JPG | 60 s cache                                          |
| Resource banner validity | `GET /banner/resource/:platform/:id/isValid`         | JSON    | 30 s cache                                          |
| Author banner            | `GET /banner/author/:platform/:id/banner.png\|jpg`   | PNG/JPG | 60 s cache                                          |
| Author banner validity   | `GET /banner/author/:platform/:id/isValid`           | JSON    | 30 s cache                                          |
| Member banner            | `GET /banner/member/:platform/:id/banner.png\|jpg`   | PNG/JPG | 60 s cache                                          |
| Member banner validity   | `GET /banner/member/:platform/:id/isValid`           | JSON    | 30 s cache                                          |
| Team banner              | `GET /banner/team/:platform/:id/banner.png\|jpg`     | PNG/JPG | 60 s cache                                          |
| Team banner validity     | `GET /banner/team/:platform/:id/isValid`             | JSON    | 30 s cache                                          |
| Saved banner recall      | `GET /banner/saved/:mnemonic.png\|jpg`               | PNG/JPG | Requires DB                                         |
| Saved banner create      | `POST /banner/saved`                                 | JSON    | Requires DB                                         |

Supported resource/author/member/team platforms: `spigot`, `modrinth`, `curseforge`, `hangar`, `ore`, `builtbybit`, `polymart`.

Hangar uses `author/slug` two-segment IDs (e.g. `/banner/resource/hangar/papermc/eternal-light/banner.png`).

### Dev Alias

`GET /server/:host/:port/...` mirrors `/banner/server/:host/:port/...` as an internal dev alias. Not part of the public API contract.

## Saved-Banner Behavior

When `DATABASE_URL` or `DB_HOST`/`DB_USER`/`DB_NAME` env vars are set (or `SAVED_BANNER_DB_ENABLED=true`), saved banners are available:

- `POST /banner/saved` creates a banner and returns a mnemonic.
- `GET /banner/saved/:mnemonic.png|jpg` recalls and re-renders a saved banner.

When DB is not configured, both routes return `503 Service Unavailable` with a JSON error body. The `/ready` endpoint reports `savedBannerDb: disabled`.

All 17 legacy `BannerType` ordinals are handled. 16 are supported for recall. `DISCORD_USER` (ordinal 17) returns `501 Not Implemented`.

## Unsupported / De-Scoped in v1

| Feature                                            | Reason                                                                                                                                                  |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DISCORD_USER` banner                              | No Discord API client planned; legacy recall already threw; product no longer relies on Discord. Returns 501 on saved recall.                           |
| Discord banner direct routes (`/banner/discord/*`) | Not mounted. No Discord client.                                                                                                                         |
| Pixel-perfect visual diff in compat-runner         | Not implemented; byte hashes recorded but not a pass/fail criterion.                                                                                    |
| Redis / external cache                             | In-process memory cache only; intentional for v1.                                                                                                       |
| Rate limiting                                      | Optional in-process per-IP rate limiting added (M27). Disabled by default (`RATE_LIMIT_ENABLED=false`). Cloudflare WAF recommended for DDoS protection. |
| Authentication on public banner routes             | Not implemented; matches legacy behavior.                                                                                                               |

## DISCORD_USER Decision

`DISCORD_USER` is explicitly unsupported for v1 (BannerType ordinal 17):

- Legacy Java saved recall already threw for Discord-type banners.
- No Discord rendering logic exists in the next API.
- Current product does not rely on Discord banner functionality.
- Saved recall returns `501 Not Implemented` with a documented error body.
- If production data proves active Discord saved banners need support, a separate Discord compatibility milestone should be opened.

The `apps/discord-bot` workspace stub is intentionally excluded from the monorepo build and typecheck references (`tsconfig.build.json`). It is not deployed in the v1 API container.

See `docs/migration/027-bannertype-coverage.md` for the full coverage matrix.

## Environment Variables

| Variable                   | Required                     | Default | Purpose                                                                                         |
| -------------------------- | ---------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `PORT`                     | no                           | `3000`  | HTTP listen port                                                                                |
| `SAVED_BANNER_DB_ENABLED`  | no                           | auto    | Force-enable (`true`) or force-disable (`false`) saved-banner DB                                |
| `DATABASE_URL`             | if using saved banners       | —       | MariaDB/MySQL connection URL                                                                    |
| `DB_HOST`                  | if using saved banners (alt) | —       | MariaDB host                                                                                    |
| `DB_PORT`                  | no                           | `3306`  | MariaDB port                                                                                    |
| `DB_USER`                  | if using saved banners (alt) | —       | MariaDB user                                                                                    |
| `DB_PASSWORD`              | no                           | —       | MariaDB password                                                                                |
| `DB_NAME`                  | if using saved banners (alt) | —       | Database name                                                                                   |
| `DB_SSL`                   | no                           | `false` | Enable MariaDB TLS                                                                              |
| `DB_POOL_CONNECTION_LIMIT` | no                           | `10`    | Connection pool size                                                                            |
| `BUILTBYBIT_API_KEY`       | no                           | —       | BuiltByBit API key; required for live BuiltByBit coverage                                       |
| `RATE_LIMIT_ENABLED`       | no                           | `false` | Enable in-process per-IP rate limiting (disabled by default)                                    |
| `RATE_LIMIT_WINDOW_MS`     | no                           | `60000` | Rate limit window duration in milliseconds                                                      |
| `RATE_LIMIT_MAX_REQUESTS`  | no                           | `300`   | Max requests per IP per window before 429                                                       |
| `METRICS_ENABLED`          | no                           | `false` | Expose `GET /metrics` with uptime and cache stats (disabled by default; do not expose publicly) |

No secrets are baked into the image. Do not commit `.env` files.

## Docker Status

- Base image: `oven/bun:1.3.14` (glibc; not Alpine; required for `@napi-rs/canvas`).
- Builder stage: installs deps, runs `typecheck`, `test`, `build`.
- Runtime stage: production-only deps, non-root `mcbanners` user, port `3000`.
- Image is fully self-contained; no external mounts required for stateless rendering.
- Saved-banner DB is optional and injected at runtime via env vars.

## Smoke Test Result Summary

From `bun run smoke:local` against a Docker container:

- `GET /health` → 200 ✅
- `GET /ready` → 200 (renderer assets ok, savedBannerDb disabled) ✅
- `GET /mc/server?host=mc.hypixel.net` → live network ✅ (or 400 if blocked)
- `GET /mc/icon?host=mc.hypixel.net` → live network ✅ (or 400 if blocked)
- `GET /banner/server/mc.hypixel.net/25565/banner.png` → 200 `image/png` ✅
- `GET /banner/resource/modrinth/sodium/banner.png` → 200 `image/png` ✅
- `GET /banner/resource/spigot/9089/banner.png` → 200 `image/png` ✅ (documented known-good EssentialsX fixture)

## Compat-Runner Result Summary

Run against production Java (`api.mcbanners.com`) vs local Docker candidate:

```
5/5 enabled cases passed, 1 skipped, 3 candidate improvements, 0 failures
```

| Case                           | Status                | Notes                                                           |
| ------------------------------ | --------------------- | --------------------------------------------------------------- |
| `mc-server-hypixel-json`       | CANDIDATE_IMPROVEMENT | Legacy Java production returns 400; candidate returns 200       |
| `mc-icon-hypixel-png`          | CANDIDATE_IMPROVEMENT | Legacy Java production returns 400; candidate returns 200       |
| `server-banner-hypixel-png`    | PASS                  | Dimensions match                                                |
| `spigot-resource-banner-png`   | PASS                  | Dimensions match (EssentialsX 9089)                             |
| `modrinth-resource-banner-png` | CANDIDATE_IMPROVEMENT | Legacy Java has JsonNode.asText null bug; candidate returns 200 |
| `saved-banner-placeholder-png` | SKIP                  | Requires shared saved-banner DB mnemonic                        |

## Candidate Improvements Over Production Java

1. `/mc/server` and `/mc/icon` return 200 for hosts that legacy production returns 400 (likely blocking behavior or SRV resolution regression in the Java service).
2. `/banner/resource/modrinth/sodium/banner.png` returns a valid image where the Java service has a JsonNode.asText null pointer bug.

## Known Java/Bun Visual Differences

Image byte hashes are not required to match between legacy Java and the Bun candidate. Known visual differences include:

- **Font rasterization**: `@napi-rs/canvas` antialiasing and subpixel rendering differs from Java AWT.
- **JPEG encoding quality**: default quality settings may differ slightly.
- **Color blending**: minor differences in PNG transparency blending behavior.
- **Text measurement**: Bun renderer uses canvas `measureText`; Java used AWT `FontMetrics`. Results are similar but not bit-identical.

Compatibility is verified at the level of: status code, content type, and image dimensions — not byte hashes.

## Known Marketplace Risks

| Platform      | Risk                     | Notes                                                                                                                          |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| BuiltByBit    | Requires API key         | Without `BUILTBYBIT_API_KEY`, all BuiltByBit routes return 404.                                                                |
| CurseForge    | 202 processing responses | CurseForge may return 202 (async processing); these map to null/404 to match Java behavior.                                    |
| Ore           | Session auth             | Ore requires session authentication; auth failure maps to null/404. Session should not leak across unrelated request contexts. |
| Hangar        | Slash IDs                | `author/slug` IDs are normalized; cache key uses URL-safe slash representation without collision risk.                         |
| All platforms | Logo fetch failures      | Logo/icon fetch failures are non-fatal; banners render with a fallback sprite.                                                 |
| All platforms | Upstream API changes     | No circuit breakers; unexpected API schema changes cause graceful null/404 fallback but may silently degrade image content.    |

## DB Readiness Status

The saved-banner MariaDB schema is implemented via Kysely migrations. Integration tests exist behind `SAVED_BANNER_DB_INTEGRATION_TEST=true`. The DB layer is not required for normal banner rendering.

Pre-production steps before enabling DB:

1. Run `bun run test:integration` against a disposable MariaDB instance.
2. Confirm migration runs without error on the production schema.
3. Set `SAVED_BANNER_DB_ENABLED=true` and supply `DATABASE_URL` or discrete `DB_*` vars.
4. Verify `/ready` reports `savedBannerDb: ok` after startup.
5. Test `POST /banner/saved` + `GET /banner/saved/:mnemonic.png` round-trip.

## Rollback Plan

1. Keep the previous Docker image tag available (`mcbanners-api-next:previous`).
2. Roll back by redeploying the previous tag with its previous env configuration.
3. If only saved-banner DB is problematic, set `SAVED_BANNER_DB_ENABLED=false` to keep all rendering routes live while investigating.
4. If renderer assets fail at `/ready`, treat the image as bad and roll back rather than bypassing the readiness check.
5. The previous Java service can be re-promoted at the proxy/CDN layer without any DB changes.

## Staging Deployment Checklist

See `docs/deployment/staging-plan.md` for the full staging workflow.

Summary:

- [ ] Docker build passes locally (`bun run check` + `bun run docker:build`)
- [ ] Staging container started with staging env vars
- [ ] `/health` and `/ready` return 200
- [ ] `bun run smoke:local -- --base-url <staging-url>` passes
- [ ] Compat-runner run against prod Java vs staging candidate passes
- [ ] Saved-banner create + recall verified on disposable/test DB
- [ ] Cache behavior verified (repeat requests served from cache)
- [ ] Logs reviewed for unexpected errors

## Production Cutover Checklist

See `docs/deployment/cutover-plan.md` for the full cutover procedure.

Summary:

- [ ] Staging sign-off complete
- [ ] Java service snapshot/backup taken
- [ ] Bun candidate deployed to production host
- [ ] DNS/proxy route switched to Bun candidate
- [ ] `/health` and `/ready` confirmed 200 on production
- [ ] `bun run smoke:local -- --base-url https://api.mcbanners.com` passes
- [ ] Sample banner URLs verified in browser/curl
- [ ] Compat-runner run against new prod
- [ ] Previous Java image kept available for 48 hours

## Post-Cutover Monitoring Checklist

- [ ] Error rate on `/banner/*` routes stays near zero
- [ ] P95 response time on banner routes acceptable
- [ ] `/ready` stays 200 (renderer assets and DB if enabled)
- [ ] No 503 spikes on `/banner/saved/*` if DB is live
- [ ] Marketplace client failures logged at warn, not panic
- [ ] Memory usage stable (in-process cache respects byte budget)
- [ ] No unexpected 400 or 404 rate increase compared to Java baseline
