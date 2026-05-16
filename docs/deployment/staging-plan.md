# Staging Deployment Plan

This document describes the recommended staging workflow before any production cutover.

## Prerequisites

- Docker installed and running locally or on the staging host.
- A disposable or dedicated test MariaDB instance for saved-banner testing.
- Both the legacy Java API and the Bun candidate reachable at separate base URLs.
- `bun install --frozen-lockfile` completed locally.

## Step 1: Local Preflight

```powershell
bun install --frozen-lockfile
bun run check
```

All 751 unit/integration tests must pass before building the image.

## Step 2: Build Docker Image

```powershell
bun run docker:build
```

The builder stage runs `typecheck`, `test`, and `build` inside the image. If the build fails, fix the issue before proceeding.

## Step 3: Start Staging Container

Without saved-banner DB:

```powershell
docker run --rm -p 3000:3000 --env PORT=3000 mcbanners-api-next:local
```

With saved-banner DB:

```powershell
docker run --rm -p 3000:3000 `
  --env PORT=3000 `
  --env SAVED_BANNER_DB_ENABLED=true `
  --env DATABASE_URL="mysql://user:password@host:3306/mcbanners_staging" `
  mcbanners-api-next:local
```

Do not bake secrets into the image or commit `.env` files.

## Step 4: Health and Readiness

```powershell
Invoke-WebRequest http://localhost:3000/health
Invoke-WebRequest http://localhost:3000/ready
```

Both must return `200`. If `/ready` returns `503`, check renderer assets or DB wiring before continuing.

## Step 5: Smoke Script

```powershell
bun run smoke:local -- --base-url http://localhost:3000 --output-dir output/smoke-staging
```

Checks:

- `/health` → 200
- `/ready` → 200
- `/mc/server?host=mc.hypixel.net` → 200 JSON (or graceful 404/400 if network restricted)
- `/mc/icon?host=mc.hypixel.net` → 200 PNG
- `/banner/server/mc.hypixel.net/25565/banner.png` → 200 PNG
- `/banner/resource/modrinth/sodium/banner.png` → 200 PNG
- `/banner/resource/spigot/9089/banner.png` → 200 PNG (documented known-good EssentialsX)

Downloaded responses are written to `output/smoke-staging/` which is git-ignored.

## Step 6: Compat-Runner Against Production Java

With both the legacy Java API (`https://api.mcbanners.com`) and the staging candidate running:

```powershell
bun run compat:compare -- `
  --legacy-base-url https://api.mcbanners.com `
  --candidate-base-url http://localhost:3000 `
  --fixture test/fixtures/compat/routes.json `
  --output-dir output/compat-staging
```

Expected outcome:

- `PASS` for `server-banner-hypixel-png` and `spigot-resource-banner-png`.
- `CANDIDATE_IMPROVEMENT` for `mc-server-hypixel-json`, `mc-icon-hypixel-png`, `modrinth-resource-banner-png`.
- `SKIP` for `saved-banner-placeholder-png`.
- `0 failures`.

If any normal case shows `FAIL`, investigate before proceeding.

## Step 7: Saved-Banner Round-Trip (If DB Available)

With a disposable test MariaDB:

```powershell
# Create a server banner save
$body = '{"bannerType":"MINECRAFT_SERVER","metadata":{"server_host":"mc.hypixel.net"}}'
$result = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/banner/saved" `
  -ContentType "application/json" -Body $body
$mnemonic = ($result.Content | ConvertFrom-Json).mnemonic

# Recall it
Invoke-WebRequest "http://localhost:3000/banner/saved/$mnemonic.png" -OutFile "output/saved-staging-recall.png"
```

Verify the recalled PNG is a valid image.

Enable the integration test suite against the staging DB:

```powershell
$env:SAVED_BANNER_DB_INTEGRATION_TEST = "true"
$env:DATABASE_URL = "mysql://user:password@localhost:3306/mcbanners_staging"
bun run test:integration
```

## Step 8: Cache Behavior

Issue two identical requests and confirm the second is served from cache (response time should be significantly faster than the first):

```powershell
Measure-Command { Invoke-WebRequest "http://localhost:3000/banner/resource/spigot/9089/banner.png" }
Measure-Command { Invoke-WebRequest "http://localhost:3000/banner/resource/spigot/9089/banner.png" }
```

## Step 9: BuiltByBit Live Check (If API Key Available)

If `BUILTBYBIT_API_KEY` is available in staging:

```powershell
Invoke-WebRequest "http://localhost:3000/banner/resource/builtbybit/7086/isValid"
```

Should return `{"valid":true}` for a known BuiltByBit resource ID.

## Step 10: Log Review

Inspect the container logs for unexpected errors, stack traces, or high-severity warnings. No uncaught exception or unhandled rejection should appear during normal smoke traffic.

## Step 11: Optional Website / Frontend Integration

If a staging or local website environment is available, point its API base URL to the staging candidate and verify rendered banner images display correctly on the website.

## Staging Sign-Off

Before marking staging complete and proceeding to production cutover:

- [ ] All smoke checks passed
- [ ] Compat-runner shows 0 failures
- [ ] Saved-banner create + recall round-trip confirmed (if DB configured)
- [ ] No unexpected errors in logs
- [ ] Cache behavior confirmed
- [ ] Previous Java image still available for rollback
