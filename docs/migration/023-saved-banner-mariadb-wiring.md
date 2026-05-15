# 023 - Saved Banner MariaDB Wiring

## Decision

Saved-banner persistence is wired through Kysely's `MysqlDialect` with `mysql2`.
This is the smallest MariaDB-compatible driver addition that matches the
existing Kysely boundary from Milestone 15. The dependency is scoped to
`@mcbanners/db`.

## Runtime Configuration

The API reads typed config from `@mcbanners/config`.

Supported env vars:

- `DATABASE_URL`: MariaDB/MySQL connection URL.
- `DB_HOST`: discrete host when `DATABASE_URL` is not used.
- `DB_PORT`: discrete port, default `3306`.
- `DB_USER`: discrete user.
- `DB_PASSWORD`: discrete password.
- `DB_NAME`: discrete database name.
- `DB_SSL`: boolean-like optional SSL flag.
- `DB_POOL_CONNECTION_LIMIT`: pool size, default `10`.
- `SAVED_BANNER_DB_ENABLED`: optional explicit enable/disable flag.

If `SAVED_BANNER_DB_ENABLED=false`, saved-banner DB wiring is disabled even when
connection env vars are present. If it is true, config must provide either
`DATABASE_URL` or a complete discrete `DB_HOST`, `DB_USER`, and `DB_NAME` set.

## Local Development

Local development can run without MariaDB. The API still exposes
`/banner/saved/*`, but those endpoints return `503` when no saved-banner
repository is configured. Unit tests inject fixture or in-memory repositories and
do not require a live database.

## Production Notes

Production should provide either `DATABASE_URL` or the discrete DB env vars. The
API runtime creates:

1. a mysql2 connection pool,
2. a Kysely database instance,
3. a `SavedBannerRepository`,
4. shutdown hooks that call `db.destroy()`.

No auth/JWT is introduced. New saved banners remain anonymous and persist
`owner = null`.

## Schema Compatibility Warning

This milestone does not add migrations and does not alter the legacy schema.
The expected table remains:

```sql
saved_banner (
  id generated number,
  type integer not null,
  owner uuid/varchar nullable,
  mnemonic unique string,
  metadata text/json string not null,
  settings text/json string not null
)
```

The `type` column stores the legacy Java `BannerType` ordinal. Do not store
string banner type names in this column.

## Optional Integration Test

`tests/integration/saved-banner-db.integration.test.ts` is skipped by default.
It only runs when:

- `SAVED_BANNER_DB_INTEGRATION=1`
- `DATABASE_URL` is set
- the database name in `DATABASE_URL` contains `test`

The test creates `saved_banner` with the compatible shape if it does not exist
and only writes a deterministic test mnemonic. This guard is intentional so
normal checks never mutate a production database.
