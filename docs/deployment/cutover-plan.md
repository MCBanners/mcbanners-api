# Production Cutover Plan

This document describes the procedure for switching production traffic from the legacy Java API to the Bun candidate.

**Prerequisites:** Staging sign-off complete (see `docs/deployment/staging-plan.md`).

## Before You Start

- Confirm staging sign-off checklist is complete.
- Confirm the production Docker host has sufficient resources (RAM for in-process cache).
- Confirm the production MariaDB is accessible from the new host if saved banners are enabled.
- Confirm the legacy Java service is still running and healthy before the switch.
- Ensure the rollback path is clear: previous Docker image tag retained, proxy switch reversible.

## Step 1: Snapshot / Backup

- Record the current legacy Java container image tag and configuration.
- Take a MariaDB snapshot/backup before any schema migration if the DB schema is being updated.
- Note the current Cloudflare/proxy routing target.

## Step 2: Deploy Bun Candidate

Pull or build the release image on the production host:

```powershell
docker pull mcbanners-api-next:release   # or re-build from the release commit
```

Start the candidate on a non-production port first for a pre-switch health check:

```powershell
docker run -d --name mcbanners-candidate -p 3001:3000 `
  --env PORT=3000 `
  --env SAVED_BANNER_DB_ENABLED=true `
  --env DATABASE_URL="mysql://user:password@host:3306/mcbanners" `
  mcbanners-api-next:release
```

## Step 3: Pre-Switch Health Check

```powershell
Invoke-WebRequest http://<production-host>:3001/health
Invoke-WebRequest http://<production-host>:3001/ready
```

Both must return `200` before switching traffic. If `/ready` returns `503`, do not switch.

## Step 4: DB Migration (If Required)

If the saved-banner DB schema needs migration:

```powershell
# Run migrations against production DB (using the candidate container or a migration tool)
bun run packages/db/src/migrate.ts
```

Confirm the migration succeeded and the DB is intact before continuing.

## Step 5: Switch Traffic at Proxy / CDN

At Cloudflare (or your front proxy):

- Update the origin for `api.mcbanners.com` to point to the Bun candidate host/port.
- Keep the change staged/reversible — do not delete the legacy origin until validation passes.
- Ensure path and query string forwarding rules preserve `/banner/*` and `/mc/*` exactly.

For self-hosted proxy (nginx/caddy):

- Update the upstream target for the relevant server block.
- Reload without full restart to avoid connection drops.

## Step 6: Post-Switch Health Check

```powershell
Invoke-WebRequest https://api.mcbanners.com/health
Invoke-WebRequest https://api.mcbanners.com/ready
```

Both must return `200` with the Bun service identifier.

## Step 7: Smoke Check Against Production

```powershell
bun run smoke:local -- --base-url https://api.mcbanners.com --output-dir output/smoke-prod-post-cutover
```

All checks must pass. The downloaded images are written to `output/smoke-prod-post-cutover/` which is git-ignored.

## Step 8: Sample Banner URL Verification

Manually verify a selection of banner URLs in a browser or curl:

```powershell
curl -o out.png "https://api.mcbanners.com/banner/resource/spigot/9089/banner.png"
curl -o out.png "https://api.mcbanners.com/banner/server/mc.hypixel.net/25565/banner.png"
curl -o out.png "https://api.mcbanners.com/banner/resource/modrinth/sodium/banner.png"
```

Confirm each returns `200 image/png` and the files are valid images.

## Step 9: Compat-Runner Post-Cutover Baseline

```powershell
bun run compat:compare -- `
  --legacy-base-url https://api.mcbanners.com `
  --candidate-base-url https://api.mcbanners.com `
  --fixture test/fixtures/compat/routes.json `
  --output-dir output/compat-prod-post-cutover
```

Since both URLs now point to the Bun candidate, all enabled cases should pass (or show CANDIDATE_IMPROVEMENT for the known legacy cases that previously failed). No failures expected.

## Step 10: Monitor

For the first 48 hours after cutover:

- Watch error rate on `/banner/*` and `/mc/*` routes in logs or metrics.
- Watch `/ready` endpoint stays `200`.
- Watch memory usage (in-process cache; should be stable, not growing unboundedly).
- Watch for unexpected `500` or `503` responses.
- Watch for marketplace client errors (Spigot, Modrinth, etc.) — these should be warn-level, not fatal.

## Rollback Steps

If a critical issue is discovered after cutover:

1. **Immediate rollback**: update Cloudflare/proxy to point back to the previous Java origin. Takes effect within seconds.
2. If the issue is only saved-banner related, set `SAVED_BANNER_DB_ENABLED=false` on the Bun candidate and re-promote it to buy time while investigating.
3. If the issue is renderer-related (`/ready` returns 503), roll back fully to Java.
4. Do not restore a DB backup unless the schema migration itself caused data loss or corruption.
5. Document the rollback in a post-mortem before attempting cutover again.

## Post-Cutover

After 48 hours of stable operation:

- Archive or de-provision the legacy Java service host (keep the image for 7 more days as a fallback).
- Remove the temporary legacy origin from Cloudflare/proxy config.
- Update `docs/deployment/v1-readiness-audit.md` with the actual cutover date and outcome.
