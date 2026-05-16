# Saved Banner Corpus Validation

`validate-saved-banner-corpus.ts` checks imported saved-banner rows against a Bun API candidate before cutover. Use it with a staging or disposable database only.

## CLI Usage

```sh
bun run saved:validate-corpus -- \
  --base-url http://localhost:3000 \
  --database-url "mysql://<user>:<password>@<host>:3306/mcbanners_staging" \
  --output-dir output/saved-banner-corpus \
  [--type MINECRAFT_SERVER] \
  [--type SPIGOT_RESOURCE] \
  [--classification INVALID_JSON] \
  [--limit 500] \
  [--concurrency 5] \
  [--save-failed-responses] \
  [--allow-production-db]
```

## Options

| Option                       | Default                      | Description                                                                       |
| ---------------------------- | ---------------------------- | --------------------------------------------------------------------------------- |
| `--base-url`                 | `http://localhost:3000`      | Bun API base URL                                                                  |
| `--database-url`             | required                     | MySQL/MariaDB connection URL                                                      |
| `--output-dir`               | `output/saved-banner-corpus` | Output directory for reports                                                      |
| `--type <BannerType>`        | all types                    | Filter to a specific BannerType; repeatable                                       |
| `--classification <cls>`     | all classifications          | Filter report results to a classification; repeatable                             |
| `--limit N`                  | all rows                     | Process at most N rows from the DB before type filtering                          |
| `--concurrency N`            | `5`                          | Parallel API calls                                                                |
| `--save-failed-responses`    | `false`                      | Write non-200 response bodies and pre-flight artifacts under the output directory |
| `--skip-known-dead-upstream` | `false`                      | Exclude dead-upstream 404s from the exit-code failure count                       |
| `--allow-production-db`      | `false`                      | Skip the DB-name safety guard                                                     |
| `--help`                     | n/a                          | Show help text                                                                    |

## Safety Behavior

The script refuses to connect unless the database name extracted from `--database-url` contains `staging`, `test`, or `dev`. The script is read-only, but the guard protects against accidental use of production credentials.

The database password is redacted before printing. Generated reports are aggregate-only: they do not include raw row IDs, saved-banner mnemonics, metadata previews, or recall URLs.

Do not publish artifacts produced with `--save-failed-responses`; those files can contain row-derived details and are ignored by git.

## Classification Outcomes

| Classification                  | Meaning                                                   | Counted As    |
| ------------------------------- | --------------------------------------------------------- | ------------- |
| `PASS_RENDERED`                 | HTTP 200 with content                                     | Pass          |
| `UNSUPPORTED_DISCORD`           | `BannerType = DISCORD_USER` is out of scope for v1        | Skip          |
| `INVALID_ORDINAL`               | `type` is not a known BannerType ordinal                  | Skip          |
| `INVALID_JSON`                  | `metadata` or `settings` is malformed JSON or wrong shape | Fail          |
| `MISSING_METADATA`              | A required metadata key is absent or empty                | Fail          |
| `RENDER_404`                    | API returned HTTP 404 and the cause is unclear            | Fail          |
| `RENDER_404_MISSING_UPSTREAM`   | HTTP 404 body indicates upstream resource not found       | Fail          |
| `RENDER_404_MISSING_METADATA`   | HTTP 404 body indicates missing or invalid metadata       | Fail          |
| `RENDER_404_SERVER_OFFLINE`     | Minecraft server appears offline or unreachable           | Dead upstream |
| `RENDER_404_DNS_FAILURE`        | Minecraft server DNS resolution failed                    | Dead upstream |
| `RENDER_404_CONNECTION_FAILURE` | Minecraft server connection failed or timed out           | Dead upstream |
| `RENDER_404_UPSTREAM_NOT_FOUND` | Minecraft server history is unknown                       | Dead upstream |
| `RENDER_404_RESOURCE_REMOVED`   | Marketplace resource likely no longer exists              | Dead upstream |
| `RENDER_503_DB_UNAVAILABLE`     | API returned HTTP 503 because DB wiring is unavailable    | Fail          |
| `RENDER_500_SERVER_ERROR`       | API returned HTTP 5xx                                     | Fail          |
| `RENDER_500`                    | Legacy HTTP 500 alias                                     | Fail          |
| `OTHER_FAILURE`                 | Network error, unexpected status, or fetch error          | Fail          |

Dead-upstream rows are historical failures where the original target no longer exists. They remain in `failCount`, but `--skip-known-dead-upstream` bases the process exit code on `actualCompatibilityFailures`.

## Output Files

`summary.json` contains machine-readable aggregate counts:

- `totalRows`, `passCount`, `skipCount`, `failCount`
- `deadUpstreamCount`
- `actualCompatibilityFailures`
- `candidateCompatibleHistoricalFailures`
- `byClassification`
- `byBannerType`
- `failureGroups`

`summary.md` contains the same aggregate information for humans.

## Typical Workflow

1. Import a production snapshot into a staging or disposable database using your normal private operations process.
2. Start the Bun API with the staging DB connected.
3. Run the corpus validator:

```sh
bun run saved:validate-corpus -- \
  --base-url http://localhost:3000 \
  --database-url "mysql://<user>:<password>@<host>:3306/mcbanners_staging" \
  --output-dir output/saved-banner-corpus
```

4. Review `summary.md` and `summary.json`.
5. Use `--type` and `--classification` for focused aggregate checks.

Example:

```sh
bun run saved:validate-corpus -- \
  --base-url http://localhost:3000 \
  --database-url "mysql://<user>:<password>@<host>:3306/mcbanners_staging" \
  --output-dir output/saved-banner-corpus-minecraft \
  --type MINECRAFT_SERVER \
  --concurrency 5 \
  --skip-known-dead-upstream
```

## Known Limitations

- `DISCORD_USER` banners are skipped because Discord user banners are de-scoped from v1.
- Sponge banners may not render because Sponge Ore is unsupported in v1.
- Images are not saved to disk by default. Inspect a specific banner only through a private staging recall URL.
- Historical 404s are often dead Minecraft servers or removed marketplace resources rather than API regressions.
