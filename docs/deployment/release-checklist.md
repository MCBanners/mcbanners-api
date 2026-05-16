# Release Checklist

This checklist is the local production verification path for the self-hosted Docker API. It does not cover the website repo or the future Discord bot.

## 1. Preflight

- Confirm the working tree contains only intended release changes.
- Confirm `../banner-api`, `../mc-api`, and `../discord-api` are untouched.
- Review `package.json`, workspace package manifests, and `bun.lock` together.
- Run deterministic checks:

```powershell
bun install --frozen-lockfile
bun run check
```

## 2. Build Docker Image

```powershell
docker build -t mcbanners-api-next:local .
```

The build must pass both stages:

- builder: `bun install --frozen-lockfile`, `bun run typecheck`, `bun run test`, `bun run build`
- runtime: `bun install --frozen-lockfile --production`

## 3. Run Local Container

Without saved-banner DB:

```powershell
docker run --rm -p 3000:3000 --env PORT=3000 mcbanners-api-next:local
```

With saved-banner DB:

```powershell
docker run --rm -p 3000:3000 `
  --env PORT=3000 `
  --env SAVED_BANNER_DB_ENABLED=true `
  --env DATABASE_URL="mysql://user:password@host:3306/mcbanners" `
  mcbanners-api-next:local
```

Do not bake secrets into the image or commit `.env` files.

## 4. Local Smoke

From another shell:

```powershell
bun run smoke:local
```

Custom target:

```powershell
bun run smoke:local -- --base-url http://localhost:3000 --output-dir output/smoke-local-api
```

The smoke script performs live network-dependent checks for Minecraft, Modrinth, and Spigot data. It is intentionally not part of `bun run check`.

The Spigot smoke case uses the documented known-good EssentialsX resource ID
`9089`. It is a required smoke check because the legacy Java production API is
known to return `image/png` for `/banner/resource/spigot/9089/banner.png`.

## 5. Compatibility Runner

Run old-vs-new comparisons only when the legacy Java API and candidate Bun API are both reachable:

```powershell
bun run compat:compare -- `
  --legacy-base-url http://localhost:8080 `
  --candidate-base-url http://localhost:3000 `
  --fixture test/fixtures/compat/routes.json `
  --output-dir output/compat-local
```

Image byte hashes may differ. Status, content type, dimensions, and route behavior are the primary compatibility signals until pixel diffing is implemented.

## 6. DB Integration Check

Normal tests must not require MariaDB. For a safe test database only, run the optional integration test with explicit DB configuration:

```powershell
$env:SAVED_BANNER_DB_INTEGRATION_TEST = "true"
$env:DATABASE_URL = "mysql://user:password@localhost:3306/mcbanners_test"
bun run test:integration
```

Use a disposable or dedicated test database. Do not point integration tests at production.

## 7. Required Env Vars

Minimum:

- `PORT`: optional, defaults to `3000`.

Saved-banner DB:

- `SAVED_BANNER_DB_ENABLED`
- `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `DB_SSL`, optional
- `DB_POOL_CONNECTION_LIMIT`, optional

External clients:

- `BUILTBYBIT_API_KEY`, optional but recommended for BuiltByBit live resource coverage.

## 8. Front Proxy Notes

The production target is self-hosted Docker behind a front proxy or CDN. Cloudflare can sit in front as DNS/CDN/proxy, but this API is not a Cloudflare Workers deployment.

Proxy requirements:

- Preserve path and query string exactly for `/banner/*` and `/mc/*`.
- Do not rewrite saved-banner mnemonic URLs.
- Preserve `png` and `jpg` suffixes.
- Set appropriate cache policy for rendered images only after compatibility review.
- Forward health and readiness paths without authentication for infrastructure probes if the deployment environment requires it.

## 9. Rollback Notes

- Keep the previous image tag available until smoke and compatibility checks pass.
- Roll back by redeploying the previous image tag and restoring the previous environment configuration.
- If a DB-backed saved-banner issue appears, disable saved-banner DB wiring with `SAVED_BANNER_DB_ENABLED=false` while keeping non-saved banner routes online.
- If renderer asset readiness fails, treat the image as bad and roll back rather than bypassing `/ready`.
