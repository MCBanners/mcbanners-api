# 027 - BannerType Coverage

This matrix freezes v1 saved-banner coverage against the legacy Java
`BannerType` ordinal order. Ordinals are DB-boundary compatibility data and must
not change.

## Coverage Matrix

| Ordinal | BannerType            | Direct route                                                                                 | Saved recall      | Metadata keys                         | Backend/client             | Status            | Known differences                                                                                         |
| ------- | --------------------- | -------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------- | -------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- |
| 0       | `SPONGE_AUTHOR`       | `/banner/author/ore/:id/isValid`, `/banner/author/ore/:id/banner.png\|jpg`                   | yes               | `author_id`                           | Ore author client          | supported         | Routed as Ore/Sponge compatibility; requires Ore auth/session behavior to keep working.                   |
| 1       | `SPONGE_RESOURCE`     | `/banner/resource/ore/:id/isValid`, `/banner/resource/ore/:id/banner.png\|jpg`               | yes               | `resource_id`                         | Ore resource client        | supported         | Route platform is `ore`; legacy type name remains `SPONGE_*`.                                             |
| 2       | `SPIGOT_AUTHOR`       | `/banner/author/spigot/:id/isValid`, `/banner/author/spigot/:id/banner.png\|jpg`             | yes               | `author_id`                           | Spigot author client       | supported         | Author resources paginate until empty page, matching Java.                                                |
| 3       | `SPIGOT_RESOURCE`     | `/banner/resource/spigot/:id/isValid`, `/banner/resource/spigot/:id/banner.png\|jpg`         | yes               | `resource_id`                         | Spigot resource client     | supported         | Numeric string id casing is preserved.                                                                    |
| 4       | `MINECRAFT_SERVER`    | `/banner/server/:host/:port/isValid`, `/banner/server/:host/:port/banner.png\|jpg`           | yes               | `server_host`; `server_port` optional | Minecraft status adapter   | supported         | Saved recall defaults missing/invalid port to `25565`, matching Java.                                     |
| 5       | `CURSEFORGE_AUTHOR`   | `/banner/author/curseforge/:id/isValid`, `/banner/author/curseforge/:id/banner.png\|jpg`     | yes               | `author_id`                           | CurseForge author client   | supported         | Uses cfwidget-compatible fixture contracts; live API should be checked before cutover.                    |
| 6       | `CURSEFORGE_RESOURCE` | `/banner/resource/curseforge/:id/isValid`, `/banner/resource/curseforge/:id/banner.png\|jpg` | yes               | `resource_id`                         | CurseForge resource client | supported         | 202/401/429/5xx map to null/404 compatibility behavior.                                                   |
| 7       | `MODRINTH_AUTHOR`     | `/banner/author/modrinth/:id/isValid`, `/banner/author/modrinth/:id/banner.png\|jpg`         | yes               | `author_id`                           | Modrinth author client     | supported         | Ids are intentionally lowercased.                                                                         |
| 8       | `MODRINTH_RESOURCE`   | `/banner/resource/modrinth/:id/isValid`, `/banner/resource/modrinth/:id/banner.png\|jpg`     | yes               | `resource_id`                         | Modrinth resource client   | supported         | Ids are intentionally lowercased.                                                                         |
| 9       | `BUILTBYBIT_AUTHOR`   | `/banner/author/builtbybit/:id/isValid`, `/banner/author/builtbybit/:id/banner.png\|jpg`     | yes               | `author_id`                           | BuiltByBit author client   | supported         | Requires API key for live use.                                                                            |
| 10      | `BUILTBYBIT_RESOURCE` | `/banner/resource/builtbybit/:id/isValid`, `/banner/resource/builtbybit/:id/banner.png\|jpg` | yes               | `resource_id`                         | BuiltByBit resource client | supported         | Resource logos remain null, matching Java resource behavior.                                              |
| 11      | `BUILTBYBIT_MEMBER`   | `/banner/member/builtbybit/:id/isValid`, `/banner/member/builtbybit/:id/banner.png\|jpg`     | yes               | `member_id`                           | BuiltByBit member client   | supported         | Requires API key for live use; join date rendered UTC `M/dd/yyyy`.                                        |
| 12      | `POLYMART_AUTHOR`     | `/banner/author/polymart/:id/isValid`, `/banner/author/polymart/:id/banner.png\|jpg`         | yes               | `author_id`                           | Polymart author client     | supported         | Account response may be user or team-shaped; fixtures cover both-compatible structure.                    |
| 13      | `POLYMART_RESOURCE`   | `/banner/resource/polymart/:id/isValid`, `/banner/resource/polymart/:id/banner.png\|jpg`     | yes               | `resource_id`                         | Polymart resource client   | supported         | Resource owner name is read from the resource response.                                                   |
| 14      | `POLYMART_TEAM`       | `/banner/team/polymart/:id/isValid`, `/banner/team/polymart/:id/banner.png\|jpg`             | yes               | `team_id`                             | Polymart team client       | supported         | Direct route is mounted under `/banner/team`; legacy mounted `/team`.                                     |
| 15      | `HANGAR_AUTHOR`       | `/banner/author/hangar/:id/isValid`, `/banner/author/hangar/:id/banner.png\|jpg`             | yes               | `author_id`                           | Hangar author client       | supported         | Hangar author/slug ids are lowercased; live endpoint shape still needs cutover verification.              |
| 16      | `HANGAR_RESOURCE`     | `/banner/resource/hangar/:id/isValid`, `/banner/resource/hangar/:id/banner.png\|jpg`         | yes               | `resource_id`                         | Hangar resource client     | supported         | Slash-containing ids are normalized without cache collisions.                                             |
| 17      | `DISCORD_USER`        | none in v1                                                                                   | no; returns `501` | `user_id`                             | none                       | unsupported in v1 | Legacy saved recall already threw for Discord. Current product no longer relies on Discord functionality. |

## Discord De-Scope

`DISCORD_USER` is intentionally unsupported for v1:

- saved recall returns documented `501`;
- no Discord bot work is planned in this API milestone;
- no Discord rendering route is mounted in the next API;
- rationale: the current product no longer relies on Discord functionality.

If production data later proves existing active saved banners require
`DISCORD_USER`, this decision should be revisited with a dedicated Discord
compatibility milestone rather than folded into resource/member/team work.

## Code-Level Coverage

The saved route exports:

- `supportedSavedBannerTypes`
- `unsupportedSavedBannerTypes`
- `requiredMetadataByBannerType`

Tests assert that those maps cover every legacy `BannerType` and that ordinal
order remains synchronized with the compatibility manifest.
