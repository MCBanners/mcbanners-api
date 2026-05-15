# 020 External Client Safety

Milestone 14 hardens marketplace client behavior before saved-banner
persistence. The goal is compatibility-first failure handling: bad upstream
responses should not crash render routes, and route IDs should be normalized
only where the legacy/platform contract requires it.

## Resource ID Normalization Policy

Resource route IDs are normalized through `normalizeResourceId(platform, id)` in
`@mcbanners/external-clients`.

| Platform     | Policy                                | Rationale                                          |
| ------------ | ------------------------------------- | -------------------------------------------------- |
| `SPIGOT`     | Preserve the input string             | Public/resource IDs are numeric strings.           |
| `CURSEFORGE` | Preserve the input string             | Public/resource IDs are numeric strings.           |
| `BUILTBYBIT` | Preserve the input string             | Public/resource IDs are numeric strings.           |
| `POLYMART`   | Preserve the input string             | Public/resource IDs are numeric strings.           |
| `MODRINTH`   | Lowercase the project id/slug         | Slug-style lookups are treated case-insensitively. |
| `HANGAR`     | Lowercase `author/slug` path segments | Hangar routes use lowercase namespace slugs.       |
| `ORE`        | Lowercase the plugin id               | Matches Java behavior for Ore plugin IDs.          |

The API resource route applies this normalization before client lookup and
before rendered-banner cache-key construction. Clients also normalize internally
so direct client usage follows the same policy.

Numeric-ID platforms intentionally do not use a blanket `id.toLowerCase()`.
This preserves string semantics such as leading zeroes and avoids changing
future non-numeric compatibility inputs at the boundary.

## Cache Key Safety

Resource banner cache keys use:

- normalized platform casing,
- `normalizeResourceId(platform, id)`,
- normalized output format,
- sorted query parameters.

Slash-containing Hangar IDs remain a single ID component in the route parser and
are tested to avoid collisions between different `author/slug` values.

## Image Safety Limits

`fetchImageBase64()` is deliberately fail-closed:

- Empty URL returns `null`.
- Non-2xx image fetch returns `null`.
- Unsupported image `Content-Type` returns `null` when the header is present.
- Oversized `Content-Length` returns `null` before body read.
- Oversized decoded body returns `null` after body read.
- Network errors and timeouts return `null`.

The default maximum image size is 1 MiB. Allowed content types are:

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`
- `image/gif`

SVG is intentionally not allowed for remote logos in this path.

Logo fetch failures remain non-fatal. Marketplace clients keep returning
resource data with `logoBase64: null` when the upstream logo is missing,
invalid, oversized, unsupported, or unavailable.

## JSON Fetch Failure Mapping

`fetchJson()` intentionally maps upstream failures to `null`:

- timeout or thrown fetch error,
- `404`,
- `202`,
- `401`,
- `429`,
- `500`,
- any other non-OK status,
- malformed JSON,
- schema mismatch.

The resource routes map client `null` results to existing compatibility
responses: `404` for banner image routes and `{ "valid": false }` for
`isValid`. This preserves legacy-style behavior where external marketplace
failures do not expose raw upstream errors to public banner URLs.

## Follow-Up Before Persistence

Saved-banner persistence can now rely on normalized route/client IDs at the API
boundary. The DB boundary should still store enough raw compatibility data to
reconstruct existing saved mnemonic URLs without re-normalizing historical
records unexpectedly.
