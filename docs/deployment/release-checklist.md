# Release Checklist

This checklist is the local production verification path for the self-hosted Bun API. It does not cover the website repo, legacy Java services, or de-scoped Discord bot.

## 1. Preflight

- Confirm the working tree contains only intended release changes.
- Confirm `../banner-api`, `../mc-api`, and `../discord-api` are untouched.
- Review `package.json`, workspace package manifests, and `bun.lock` together.
- Confirm no forbidden generated or sensitive files are tracked:

```powershell
git ls-files | Select-String "node_modules|/dist/|/output/|tsbuildinfo|.sql|.sql.gz|.zip|.env"
bun run public:check
```

Both commands must pass before release. The `git ls-files` command should return no output except explicitly allowed public examples such as `.env.example`.

Run deterministic checks:

```powershell
bun install --frozen-lockfile
bun run format
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
  --env DATABASE_URL="mysql://<user>:<password>@<host>:3306/mcbanners" `
  mcbanners-api-next:local
```

Do not bake secrets into the image or commit `.env` files.

## 4. Local Smoke

```powershell
bun run smoke:local
```

Custom target:

```powershell
bun run smoke:local -- --base-url http://localhost:3000 --output-dir output/smoke-local-api
```

The smoke script performs live network-dependent checks for Minecraft, Modrinth, and Spigot data. It is intentionally not part of `bun run check`.

## 5. Compatibility Runner

Run old-vs-new comparisons only when the legacy API and candidate Bun API are both reachable:

```powershell
bun run compat:compare -- `
  --legacy-base-url http://localhost:8080 `
  --candidate-base-url http://localhost:3000 `
  --fixture test/fixtures/compat/routes.json `
  --output-dir output/compat-local
```

Image byte hashes may differ. Status, content type, dimensions, and route behavior are the primary compatibility signals.

## 6. DB Integration Check

Normal tests must not require MariaDB. For a safe test database only:

```powershell
$env:SAVED_BANNER_DB_INTEGRATION = "1"
$env:DATABASE_URL = "mysql://<user>:<password>@<host>:3306/mcbanners_test"
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

Rate limiting:

- `RATE_LIMIT_ENABLED`: optional, defaults to `false`
- `RATE_LIMIT_WINDOW_MS`: optional, defaults to `60000`
- `RATE_LIMIT_MAX_REQUESTS`: optional, defaults to `300`

Observability:

- `METRICS_ENABLED`: optional, defaults to `false`; keep `GET /metrics` behind a firewall or proxy block in production.

External clients:

- `BUILTBYBIT_API_KEY`, optional but recommended for BuiltByBit live coverage.

## 8. Front Proxy Notes

- Preserve path and query string exactly for `/banner/*` and `/mc/*`.
- Do not rewrite saved-banner mnemonic URLs.
- Preserve `png` and `jpg` suffixes.
- Set cache policy for rendered images only after compatibility review.
- Forward health and readiness paths without authentication if infrastructure probes require it.

## 9. Rollback Notes

- Keep the previous image tag available until smoke and compatibility checks pass.
- Roll back by redeploying the previous image tag and restoring the previous environment configuration.
- If a DB-backed saved-banner issue appears, disable saved-banner DB wiring with `SAVED_BANNER_DB_ENABLED=false` while keeping non-saved banner routes online.
- If renderer asset readiness fails, treat the image as bad and roll back rather than bypassing `/ready`.
