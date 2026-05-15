# 015 — Resource Banner Layout Migration

## Overview

This document describes the port of the Java `ResourceLayout` + `ResourceParameters` pipeline into the TypeScript renderer layer as a fixture-driven vertical slice (Milestone 9).

No live marketplace API clients are implemented here. All rendering is fixture-driven.

## Java Source References

| Java File | Port Location |
|-----------|--------------|
| `ResourceLayout.java` | `packages/banner-renderer/src/layouts/resource/resource-banner-layout.ts` |
| `ResourceParameters.java` | `packages/banner-renderer/src/layouts/resource/resource-banner-defaults.ts` + `resource-banner-params.ts` |
| `LogoComponent.java` | Inlined in `buildResourceBannerNodes` (logo y-centering, max size cap) |
| `Layout.java` (base) | `resolveTextColor`, `makeTextNode`, background image node |
| `NumberUtil.java` | `packages/banner-renderer/src/text/number-util.ts` → `abbreviateNumber` |
| `Layout.java` (date helper) | `packages/banner-renderer/src/text/date-util.ts` → `formatUpdatedDate` |

## Defaults Ported (from ResourceParameters.java)

All defaults are exact ports — do not change without verifying against the Java source.

| Field | x | y | fontSize | fontBold | Notes |
|-------|---|---|----------|----------|-------|
| resourceName | 104 | 25 | 18 | true | Display override respects "unset" value |
| authorName | 104 | 42 | 14 | false | Always "by {name}" format |
| reviews | 104 | 62 | 14 | false | Hangar: "{n} stars"; others: "{n} reviews" |
| updated | 104 | 62 | 14 | false | CurseForge/Modrinth only: "Updated: M/dd/yyyy" |
| stars | x=180 | y=51 | — | — | gap=14 (pixel stride between star centers) |
| downloads | 104 | 83 | 14 | false | "purchases" for premium, "downloads" for free |
| price | 210 | 83 | 14 | true | Only rendered for premium (price != null) |

Global (from GlobalParameters.java):
- `background.template`: `MOONLIGHT_PURPLE`
- `logo.x`: `12`
- `logo.size`: `80`
- `RESOURCE_BANNER_LOGO_MAX_SIZE`: `96` (from LogoComponent maxLogoSize default)

## Backend Conditional Behavior

### Reviews vs. Updated Date

```
CURSEFORGE, MODRINTH → render "Updated: M/dd/yyyy" (uses `updated` namespace)
HANGAR              → render "{n} stars" (uses `reviews` namespace)
All other backends  → render "{n} reviews" (uses `reviews` namespace)
```

The `M/dd/yyyy` format matches Java's `SimpleDateFormat("M/dd/yyyy", Locale.ENGLISH)` in UTC.

### Star Sprites

Stars are rendered **only when**:
- `resource.rating.average` is non-null
- Backend is **not** CURSEFORGE, MODRINTH, or HANGAR

When rendered: 5 sprites at `x = stars.x + (gap * i)`, `y = stars.y`, size = 12×12 px.

Star selection logic (ported from ResourceLayout.java, mutating `ratingAvg`):
```
ratingAvg >= 1.00 → STAR_FULL  (subtract 1.00)
ratingAvg >= 0.75 → STAR_FULL  (subtract 0.75)
ratingAvg >= 0.25 → STAR_HALF  (subtract 0.50)
else              → STAR_NONE
```

### Backend Fallback Logo Sprites

When `resource.logoBase64` is null or empty, a backend-specific sprite is used:

| Backend | Sprite Key |
|---------|-----------|
| SPIGOT | `DEFAULT_SPIGOT_RES_LOGO` |
| ORE | `DEFAULT_SPONGE_RES_LOGO` |
| CURSEFORGE | `DEFAULT_CURSEFORGE_RES_LOGO` |
| MODRINTH | `DEFAULT_MODRINTH_RES_LOGO` |
| BUILTBYBIT | `DEFAULT_BUILTBYBIT_RES_LOGO` |
| POLYMART | `DEFAULT_POLYMART_RES_LOGO` |
| HANGAR | `DEFAULT_HANGAR_RES_LOGO` |

### Premium vs. Free Resources

| Condition | Downloads wording | Price field rendered |
|-----------|------------------|---------------------|
| `resource.price == null` (free) | "downloads" | No |
| `resource.price != null` (premium) | "purchases" | Yes: `{amount:.2f} {currency}` |

## ResourceName Display Override

The `resource_name__display` parameter has an extra compatibility rule:

```
display == ""       → use resource.name  (empty = unset)
display == "unset"  → use resource.name  (literal "unset" = unset)
otherwise           → use display value
```

This matches the Java constructor logic:
```java
if (resourceTitle.isEmpty() || resourceTitle.equalsIgnoreCase("unset")) {
    resourceTitle = resource.name();
}
```

## Number Abbreviation

`abbreviateNumber` matches `NumberUtil.abbreviate(long)` exactly:

| Input | Output |
|-------|--------|
| 999 | "999" |
| 1000 | "1K" |
| 1500 | "1.5K" |
| 15000 | "15K" |
| 1500000 | "1.5M" |
| 250000000 | "250M" |

Decimal is shown only when `truncated < 100 && truncated % 10 != 0`.

## Query Parameter Namespaces

All standard text namespaces support: `x`, `y`, `font_size`, `font_bold`, `font_face`, `text_align`, `display`, `enable`, `max_chars`.

The `stars` namespace supports: `x`, `y`, `gap`.

Example: `resource_name__font_size=22&stars__gap=16&background__template=BLUE_RADIAL`

## Logo Y-Centering

Same formula as LogoComponent.java:
```
logoSize = min(settings.logo.size, RESOURCE_BANNER_LOGO_MAX_SIZE)
logoY = floor((RESOURCE_BANNER_HEIGHT - logoSize) / 2)
```

## Fixture Corpus

Located in `packages/banner-renderer/test/fixtures/resource-fixtures.ts`:

| Fixture | Backend | Notes |
|---------|---------|-------|
| `FIXTURE_SPIGOT_FREE` | SPIGOT | With logo, 4.5 star rating, 1.25M downloads |
| `FIXTURE_SPIGOT_PREMIUM` | SPIGOT | Premium, price=9.99 USD, 4.75 star rating |
| `FIXTURE_MODRINTH` | MODRINTH | Updated date path, no rating average |
| `FIXTURE_CURSEFORGE` | CURSEFORGE | Updated date path, 250M downloads |
| `FIXTURE_HANGAR` | HANGAR | Stars label, no logo → fallback sprite |
| `FIXTURE_NO_LOGO` | SPIGOT | No logo, 3.5 star rating |
| `FIXTURE_LONG_NAME` | SPIGOT | Name exceeds typical width |
| `FIXTURE_UNICODE` | SPIGOT | Japanese name and author |

## Local Render Script

```sh
bun run scripts/render-resource-fixture.ts [fixtureName] [outputDir]

# Examples:
bun run scripts/render-resource-fixture.ts spigot-free
bun run scripts/render-resource-fixture.ts spigot-premium ./tmp/out
bun run scripts/render-resource-fixture.ts modrinth
```

Output: `{outputDir}/{fixtureName}.png` and `.jpg`.

## Remaining Gaps Before Live Resource API Routes

1. **No live marketplace clients** — no Spigot/Modrinth/CurseForge/Hangar/etc. API integration
2. **No Hono resource routes** — `GET /banner/resource/:backend/:id/banner.png` not yet wired
3. **No resource caching** — cache layer not yet applied to resource banners
4. **ORE/Sponge backend** — present in domain enum but no real client planned
5. **Author logo** — `DEFAULT_AUTHOR_LOGO` sprite exists but no author banner layout yet

These gaps will be addressed in Milestone 10 (resource API routes).
