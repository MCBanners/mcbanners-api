# 025 - Author Layout And Routes

## Java Sources Referenced

- `AuthorLayout.java`
- `AuthorParameters.java`
- `AuthorController.java`
- `AuthorService.java`
- `SpigotAuthorService.java`
- `CurseForgeAuthorService.java`
- `ModrinthAuthorService.java`
- `OreAuthorService.java`
- `HangarAuthorService.java`
- `BuiltByBitAuthorService.java`
- `PolymartAuthorService.java`
- `LogoComponent.java`
- `Sprite.java`
- `NumberUtil.java`
- `BannerType.java`

## Route Scope

Implemented:

- `GET /banner/author/:platform/:id/isValid`
- `GET /banner/author/:platform/:id/banner.png`
- `GET /banner/author/:platform/:id/banner.jpg`

Not implemented in this milestone:

- member routes
- team routes
- Discord bot behavior

## Layout Behavior

The author banner uses the same 300x100 canvas as server and resource banners.
It renders:

- global background from `background__template`
- author logo from the upstream avatar, falling back to `DEFAULT_AUTHOR_LOGO`
- `author_name`
- `resource_count`
- `likes`
- `downloads`
- `reviews`

Java defaults are preserved:

| Namespace        | x   | y   | Notes           |
| ---------------- | --- | --- | --------------- |
| `logo`           | 12  |     | size `80`       |
| `author_name`    | 104 | 22  | size `18`, bold |
| `resource_count` | 104 | 38  | text namespace  |
| `likes`          | 104 | 55  | text namespace  |
| `downloads`      | 104 | 72  | text namespace  |
| `reviews`        | 104 | 89  | text namespace  |

Java conditional wording is preserved:

- Modrinth likes are rendered as `followers`.
- Hangar likes are rendered as `stars`.
- Hangar reviews are rendered as `views`.
- Missing likes or reviews are omitted, matching Java's `-1` sentinel behavior.

Display overrides use the same text namespace behavior as resource banners:
non-empty `namespace__display` replaces the computed text.

## Platform Support

| Platform   | Status      | Notes                                                                |
| ---------- | ----------- | -------------------------------------------------------------------- |
| Spigot     | implemented | author endpoint plus paginated resource aggregation until empty page |
| CurseForge | implemented | cfwidget author endpoint, project download aggregation               |
| Modrinth   | implemented | user endpoint plus user projects aggregation                         |
| Ore        | implemented | authenticated project owner query and auth avatar URL                |
| Hangar     | implemented | user plus projects lookup; endpoint shape may need live verification |
| BuiltByBit | implemented | member plus resources-by-author lookup, API key required             |
| Polymart   | implemented | account lookup by user id                                            |

All clients return `null` on missing authors, upstream failure, or malformed
responses. No live network tests are required.

## Saved Banner Recall

Saved recall now supports author banner types when `author_id` is present in
metadata:

- `SPONGE_AUTHOR`
- `SPIGOT_AUTHOR`
- `CURSEFORGE_AUTHOR`
- `MODRINTH_AUTHOR`
- `BUILTBYBIT_AUTHOR`
- `POLYMART_AUTHOR`
- `HANGAR_AUTHOR`

Unsupported saved types such as `DISCORD_USER` remain explicitly unsupported.
Member and team saved rows are covered separately in milestone 20.

## Known Java Differences

- Spigot author aggregation now mirrors Java pagination: request page `1`,
  append each non-empty page, stop on the first empty page, and return `null`
  when any resource page fails or has malformed JSON.
- Hangar user/project endpoint shapes are based on the Hangar API shape used by
  the Java wrapper and should be live-verified before cutover.
- BuiltByBit author avatar fetching is implemented for author banners; resource
  banners still intentionally do not fetch a BBB resource logo.
