# Saved Banner Corpus Validation

This document describes the `validate-saved-banner-corpus.ts` script, which
validates every imported production `saved_banner` row against the Bun candidate
API before cutover.

---

## Purpose

After importing a production database snapshot into a staging environment, run
this script to measure how many saved banner recall routes work correctly under
the Bun candidate. The output drives a go/no-go decision before cutover.

---

## CLI Usage

```sh
bun run saved:validate-corpus -- \
  --base-url http://localhost:3000 \
  --database-url mysql://root:root@127.0.0.1:3307/mcbanners_staging \
  --output-dir output/saved-banner-corpus \
  [--type MINECRAFT_SERVER] \
  [--type SPIGOT_RESOURCE] \
  [--limit 500] \
  [--concurrency 5] \
  [--sample-failures 100] \
  [--save-failed-responses] \
  [--allow-production-db]
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--base-url` | `http://localhost:3000` | Bun API base URL |
| `--database-url` | _(required)_ | MySQL/MariaDB connection URL |
| `--output-dir` | `output/saved-banner-corpus` | Output directory for reports |
| `--type <BannerType>` | _(all types)_ | Filter to a specific BannerType (repeatable) |
| `--limit N` | _(all rows)_ | Process at most N rows from DB (before type filter) |
| `--concurrency N` | `5` | Parallel API calls |
| `--sample-failures N` | `100` | Include up to N failures in the report |
| `--save-failed-responses` | `false` | Write non-200 response bodies to `output-dir/failed-responses/` |
| `--allow-production-db` | `false` | Skip the DB name safety guard |
| `--help` | — | Show help text |

---

## Safety Behavior

The script **refuses to connect** unless the database name (extracted from the
`--database-url` path) contains one of:

- `staging`
- `test`
- `dev`

This prevents accidental mutations against a production database. The script
is **read-only** (`SELECT` only) but the guard provides extra protection.

To run against a production database deliberately, pass `--allow-production-db`.

The database password is **never logged**. URLs are always redacted before
printing.

---

## Classification Outcomes

Each row is classified into one of the following outcomes:

| Classification | Meaning | Counted As |
|----------------|---------|-----------|
| `PASS_RENDERED` | HTTP 200 with content | Pass |
| `UNSUPPORTED_DISCORD` | `BannerType = DISCORD_USER` (ordinal 17) — not implemented in v1 | Skip |
| `INVALID_ORDINAL` | `type` column is not a known BannerType ordinal | Skip |
| `INVALID_JSON` | `metadata` or `settings` column is malformed JSON or wrong shape | Fail |
| `MISSING_METADATA` | A required metadata key is absent or empty | Fail |
| `RENDER_404` | API returned HTTP 404 (body empty or cause unclear) | Fail |
| `RENDER_404_MISSING_UPSTREAM` | 404 and body indicates upstream resource not found | Fail |
| `RENDER_404_MISSING_METADATA` | 404 and body indicates missing/invalid metadata | Fail |
| `RENDER_503_DB_UNAVAILABLE` | API returned HTTP 503 (DB not configured) | Fail |
| `RENDER_500_SERVER_ERROR` | API returned HTTP 5xx | Fail |
| `RENDER_500` | HTTP 500 (legacy alias, kept for compatibility) | Fail |
| `OTHER_FAILURE` | Network error, unexpected HTTP status, or fetch error | Fail |

### Exit code

- `0` — all rows passed or were skipped
- `1` — at least one row was classified as a failure

---

## Output Files

After the script runs, the output directory contains:

### `summary.json`

Machine-readable JSON with:

```jsonc
{
  "meta": { "baseUrl": "...", "rowCount": 1234 },
  "totalRows": 1234,
  "passCount": 1100,
  "skipCount": 80,
  "failCount": 54,
  "byClassification": { "PASS_RENDERED": 1100, "RENDER_404": 30, ... },
  "byBannerType": { "SPIGOT_RESOURCE": 400, "MODRINTH_RESOURCE": 200, ... },
  "failureGroups": {
    "byBannerTypeAndClassification": { "SPIGOT_RESOURCE:RENDER_404": 28, ... },
    "byHttpStatus": { "404": 30, "500": 24, ... },
    "byBannerTypeAndMetadataKeySet": { "SPIGOT_RESOURCE:{resource_id}": 28, ... },
    "byResponseBodyMessage": { "{\"error\":\"DB not configured\"}": 24, ... }
  },
  "sampledFailures": [
    {
      "id": 42,
      "mnemonic": "abcdefghijklmn",
      "typeOrdinal": 3,
      "bannerType": "SPIGOT_RESOURCE",
      "classification": "RENDER_404",
      "httpStatus": 404,
      "metadataKeys": ["resource_id"],
      "metadataPreview": "resource_id=12345",
      "settingsKeys": ["bg_color"],
      "recallUrl": "http://localhost:3000/banner/saved/abcdefghijklmn.png",
      "responseBodyPreview": ""
    }
    ...
  ]
}
```

### `summary.md`

Human-readable Markdown table with classification totals, per-type breakdown,
and a sampled failures table.

---

## Typical Workflow

1. Import production database snapshot into staging:

   ```sh
   mysqldump -u root -p mcbanners | mysql -u root mcbanners_staging
   ```

2. Start the Bun candidate API with staging DB connected:

   ```sh
   DATABASE_URL=mysql://root:root@127.0.0.1:3307/mcbanners_staging \
     bun run apps/api/src/index.ts
   ```

3. Run the corpus validator:

   ```sh
   bun run saved:validate-corpus -- \
     --base-url http://localhost:3000 \
     --database-url mysql://root:root@127.0.0.1:3307/mcbanners_staging \
     --output-dir output/saved-banner-corpus
   ```

4. Review `output/saved-banner-corpus/summary.md` for failures.

5. For targeted analysis, use `--type` to focus on a single banner type:

   ```sh
   bun run saved:validate-corpus -- \
     --base-url http://localhost:3000 \
     --database-url mysql://root:root@127.0.0.1:3307/mcbanners_staging \
     --output-dir output/saved-banner-corpus-minecraft \
     --type MINECRAFT_SERVER --sample-failures 100 --concurrency 5
   ```

6. Investigate sampled failures to determine if they are:
   - Known unsupported types (DISCORD_USER — expected skip)
   - Data quality issues in imported rows
   - Genuine regressions requiring fixes

---

## Known Limitations

- **DISCORD_USER banners are always skipped.** The Discord user banner type
  is intentionally out of scope for v1. These rows will appear in the
  `UNSUPPORTED_DISCORD` skip bucket.

- **Sponge banners (SPONGE_AUTHOR / SPONGE_RESOURCE) are unlikely to render.**
  Sponge Ore is unsupported in v1 and these rows will likely produce
  `RENDER_404` failures.

- **Images are not saved to disk by default.** The script records byte size
  but discards the image bytes. To inspect a specific banner visually, use
  the recall URL directly: `GET /banner/saved/<mnemonic>.png`.

- **No concurrency.** Rows are processed sequentially to keep the script
  simple. For very large corpora, consider using `--limit` to process in
  batches.
