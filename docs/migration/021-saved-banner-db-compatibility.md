# 021 Saved Banner DB Compatibility

Milestone 15 establishes the saved-banner persistence boundary only. It does
not add saved recall routes, JWT/auth, user accounts, migrations, or Discord bot
behavior.

## Legacy Schema

The v1 DB boundary preserves the legacy JPA table shape exactly:

| Column     | Legacy meaning                              | TypeScript/Kysely mapping |
| ---------- | ------------------------------------------- | ------------------------- |
| `id`       | Generated numeric primary key               | `Generated<number>`       |
| `type`     | `BannerType` stored with `EnumType.ORDINAL` | `number`                  |
| `owner`    | Optional legacy user UUID                   | `string \| null`          |
| `mnemonic` | Unique public saved-banner mnemonic         | `string`                  |
| `metadata` | JSON string from `Map<String, String>`      | `string`                  |
| `settings` | JSON string from `Map<String, String>`      | `string`                  |

Table name: `saved_banner`.

The Kysely database interface lives in `packages/db/src/schema.ts`. No migration
files are added in this milestone because the goal is compatibility mapping, not
schema redesign.

## Repository API

`createSavedBannerRepository(db)` exposes:

- `findByMnemonic(mnemonic)`
- `insertSavedBanner(input)`
- `findAllByOwner(owner)`

`findAllByOwner()` exists only as a legacy helper. Current product flows should
not depend on account ownership because the website no longer has user accounts.

`createDb({ dialect })` constructs a typed `Kysely<MCBannersDatabase>` while
leaving the concrete MariaDB driver wiring to deployment/bootstrap code. This
keeps normal tests deterministic and avoids requiring a live MariaDB instance.

## Ordinal Compatibility

The legacy `type` column stores Java `BannerType.ordinal()`. The TypeScript
boundary therefore uses:

- `encodeBannerTypeOrdinal(bannerType)`
- `decodeBannerTypeOrdinal(ordinal)`

Invalid ordinals throw instead of guessing. This matters because inserting enum
names or reordering values would corrupt legacy saved-banner recall. Internally,
the code continues to use string-safe `BannerType` unions; raw numeric ordinals
belong at the DB boundary only.

## Metadata And Settings

Legacy `SavedController.saveBanner()` serialized request `metadata` and
`settings` maps with Jackson. The new helpers preserve that shape:

- metadata is serialized as a JSON object string,
- settings is serialized as a JSON object string,
- missing/null settings serialize to `"{}"`,
- parsed metadata/settings must be objects with string values.

These helpers intentionally do not interpret metadata keys yet. Saved recall
rendering will decide how to map keys such as `resource_id`, `server_host`,
`server_port`, `member_id`, and `team_id`.

## Anonymous Ownership

The current website no longer has user accounts. New v1 saves are anonymous and
public by default, so `insertSavedBanner()` persists `owner: null` unless a
legacy owner UUID is explicitly supplied by a compatibility workflow.

The nullable `owner` column remains in the schema only to read legacy rows and
avoid changing the existing database contract.

## Auth/JWT Decision

Auth and JWT are intentionally not implemented in this milestone. Adding account
identity now would revive a product concept that no longer exists on the current
website and would complicate saved-banner compatibility before recall rendering
is complete.

## Future Migration Idea

After legacy compatibility is proven, a future non-breaking migration could add:

- a string banner type column for safer application reads,
- optional account ownership in a new table/column if the product brings
  accounts back,
- generated JSON columns or validation for metadata/settings.

The legacy `type` ordinal column should remain supported until all existing
mnemonic URLs are migrated or permanently bridged.
