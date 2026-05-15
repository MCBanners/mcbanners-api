# 022 Saved Banner HTTP Routes

Milestone 16 adds saved-banner HTTP save and recall routes backed by an injected
repository. It proves route behavior with fixture/in-memory tests and still does
not wire a live MariaDB driver.

## Routes

Mounted under `/banner/saved` when `createApp()` receives a saved-banner
repository:

- `POST /banner/saved/save`
- `GET /banner/saved/:mnemonic.png`
- `GET /banner/saved/:mnemonic.jpg`

The repository is injected through app composition so normal tests do not need a
database connection.

## Save Behavior

The save route accepts the legacy body shape:

```json
{
  "type": "SPIGOT_RESOURCE",
  "metadata": {
    "resource_id": "12345"
  },
  "settings": {}
}
```

`type` may be a `BannerType` string or a compatible legacy ordinal number.
`metadata` is required, must be a non-empty object, and must contain string
values. Missing `settings` defaults to `{}`.

New saves are anonymous/public in v1:

- `owner` is always persisted as `null`.
- No auth/JWT/user account state is read.
- The legacy nullable `owner` column remains only for compatibility.

The repository stores:

- `type` as the Java `BannerType.ordinal()` number,
- `metadata` as a JSON string,
- `settings` as a JSON string,
- a generated 14-character alphabetic mnemonic.

The response includes the persisted row fields plus `bannerType` for practical
debuggability while preserving the stored ordinal.

## Recall Behavior

Recall looks up the saved row by mnemonic, decodes the legacy ordinal, parses the
stored JSON strings, then renders through the already-supported server/resource
renderer paths.

Supported saved recall types:

- `MINECRAFT_SERVER`
- `SPIGOT_RESOURCE`
- `MODRINTH_RESOURCE`
- `CURSEFORGE_RESOURCE`
- `HANGAR_RESOURCE`
- `SPONGE_RESOURCE` as Ore resource
- `BUILTBYBIT_RESOURCE`
- `POLYMART_RESOURCE`

Supported outputs:

- `.png` -> `image/png`
- `.jpg` -> `image/jpeg`

Missing saved rows return `404`. Missing upstream server/resource data also
returns `404`.

## Unsupported And Corrupt Stored Data

Unsupported saved banner types return `501` with an explicit error. This avoids
silently guessing behavior for saved author/member/team/Discord rows before
those render paths are implemented.

Corrupt stored rows return a safe `500`:

- invalid `BannerType` ordinal,
- invalid `metadata` JSON,
- invalid `settings` JSON,
- missing required recall metadata such as `server_host` or `resource_id`.

## DB Driver Deferred

The live MariaDB driver and application configuration are still deferred. The
route is repository-injected so the current implementation can use an in-memory
test repository, and production can later supply a Kysely/MariaDB repository
without changing route behavior.

## Remaining Work

Before enabling saved banners against the live database:

- wire the MariaDB dialect/driver and environment configuration,
- add integration tests for the real repository,
- decide whether to retry mnemonic generation on unique-key collisions,
- implement or explicitly migrate unsupported saved author/member/team rows,
- add operational logging around corrupt legacy saved rows.
