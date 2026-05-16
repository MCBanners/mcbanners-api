# Staging Deployment Plan

This document describes the recommended staging workflow before production cutover.

## Prerequisites

- Docker installed and running locally or on the staging host.
- A disposable or dedicated test MariaDB instance for saved-banner testing.
- The legacy API and Bun candidate reachable at separate base URLs when running compatibility comparisons.
- `bun install --frozen-lockfile` completed locally.

## 1. Local Preflight

```powershell
bun install --frozen-lockfile
bun run public:check
bun run check
```

All local checks must pass before building the image.

## 2. Build Docker Image

```powershell
bun run docker:build
```

The builder stage runs typecheck, tests, and build inside the image. Fix any failure before proceeding.

## 3. Start Staging Container

Without saved-banner DB:

```powershell
docker run --rm -p 3000:3000 --env PORT=3000 mcbanners-api-next:local
```

With saved-banner DB:

```powershell
docker run --rm -p 3000:3000 `
  --env PORT=3000 `
  --env SAVED_BANNER_DB_ENABLED=true `
  --env DATABASE_URL="mysql://<user>:<password>@<host>:3306/mcbanners_staging" `
  mcbanners-api-next:local
```

Do not bake secrets into the image or commit `.env` files.

## 4. Health and Readiness

```powershell
Invoke-WebRequest http://localhost:3000/health
Invoke-WebRequest http://localhost:3000/ready
```

Both should return `200`. If `/ready` returns `503`, check renderer assets or DB wiring before continuing.

## 5. Smoke Script

```powershell
bun run smoke:local -- --base-url http://localhost:3000 --output-dir output/smoke-staging
```

Checks:

- `/health` -> 200
- `/ready` -> 200
- `/mc/server?host=mc.hypixel.net` -> 200 JSON, or graceful 404/400 if network restricted
- `/mc/icon?host=mc.hypixel.net` -> 200 PNG
- `/banner/server/mc.hypixel.net/25565/banner.png` -> 200 PNG
- `/banner/resource/modrinth/sodium/banner.png` -> 200 PNG
- `/banner/resource/spigot/9089/banner.png` -> 200 PNG for the documented EssentialsX fixture

Downloaded responses are written to `output/smoke-staging/`, which is ignored by git.

## 6. Compatibility Runner

Run old-vs-new comparisons only when both APIs are reachable:

```powershell
bun run compat:compare -- `
  --legacy-base-url https://api.mcbanners.com `
  --candidate-base-url http://localhost:3000 `
  --fixture test/fixtures/compat/routes.json `
  --output-dir output/compat-staging
```

Expected result: zero failures. Investigate any normal route mismatch before proceeding.

## 7. Saved-Banner Round Trip

With a disposable test MariaDB:

```powershell
$body = '{"bannerType":"MINECRAFT_SERVER","metadata":{"server_host":"mc.hypixel.net"}}'
$result = Invoke-WebRequest -Method POST -Uri "http://localhost:3000/banner/saved/save" `
  -ContentType "application/json" -Body $body
$mnemonic = ($result.Content | ConvertFrom-Json).mnemonic

Invoke-WebRequest "http://localhost:3000/banner/saved/$mnemonic.png" -OutFile "output/saved-staging-recall.png"
```

Verify the recalled PNG is a valid image.

Optional integration tests:

```powershell
$env:SAVED_BANNER_DB_INTEGRATION = "1"
$env:DATABASE_URL = "mysql://<user>:<password>@<host>:3306/mcbanners_staging"
bun run test:integration
```

## 8. Cache Behavior

Issue two identical requests and confirm the second is served from cache or completes materially faster:

```powershell
Measure-Command { Invoke-WebRequest "http://localhost:3000/banner/resource/spigot/9089/banner.png" }
Measure-Command { Invoke-WebRequest "http://localhost:3000/banner/resource/spigot/9089/banner.png" }
```

## 9. BuiltByBit Live Check

If `BUILTBYBIT_API_KEY` is available in staging:

```powershell
Invoke-WebRequest "http://localhost:3000/banner/resource/builtbybit/7086/isValid"
```

The response should be `{"valid":true}` for a known live resource ID.

## 10. Log Review

Inspect container logs for unexpected errors, stack traces, uncaught exceptions, or unhandled rejections during normal smoke traffic.

## Staging Sign-Off

- [ ] Public-readiness and normal checks passed
- [ ] Docker image built successfully
- [ ] Smoke checks passed
- [ ] Compatibility runner shows zero failures
- [ ] Saved-banner create and recall confirmed when DB is configured
- [ ] No unexpected errors in logs
- [ ] Previous image remains available for rollback
