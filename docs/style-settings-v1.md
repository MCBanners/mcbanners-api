# Style Settings v1

The Customization v1 style layer allows callers to override background, text colours, shadow, and logo positioning on any banner type without touching individual text-element parameters.

---

## Goals

- Provide a single, versioned namespace for banner-level visual customisation.
- Enable solid-colour backgrounds as a first-class alternative to template images.
- Allow per-role text colour overrides (primary / secondary / accent).
- Provide drop-shadow presets for text readability on custom backgrounds.
- Expose a logo vertical-offset for minor layout adjustments.

## Non-goals

- Per-element colour overrides (use the existing element namespace for that).
- Custom fonts or font sizes.
- Alpha/transparency support for background colours (solid RGB only).
- Background images uploaded by the caller.

---

## Settings keys

All keys follow the `namespace__key` convention used throughout the settings layer.

| Key | Type | Default | Description |
|---|---|---|---|
| `style__version` | integer | — | Must be `1`. If present with a different value the style block is rejected and the request falls back to legacy rendering. |
| `background__mode` | enum | `template` | `template` — use the template image selected by `background__template`. `solid` — fill the canvas with `background__color`. |
| `background__color` | hex color | — | Required when `background__mode=solid`. Canonical `#rrggbb` (case-insensitive; `#` optional; 3-char shorthand accepted). |
| `text__primary_color` | hex color | — | Override for the primary text role (banner title / name). |
| `text__secondary_color` | hex color | — | Override for the secondary text role (stats, author, supporting text). |
| `text__accent_color` | hex color | — | Override for the accent text role (currently unused in built-in layouts; reserved). |
| `shadow__preset` | enum | — | Text drop-shadow preset: `none`, `soft`, or `strong`. Absent = no shadow applied. |
| `logo__y` | integer | `0` | Vertical offset applied on top of the automatically centred logo position. Clamped to `[-50, 50]`. |

---

## HEX color validation rules

Accepted formats (case-insensitive, `#` prefix optional):

- 3-character shorthand: `fff`, `#fff`, `0F8`, `#0F8` — each nibble is doubled (`0F8` → `#00ff88`).
- 6-character full form: `ffffff`, `#ffffff`, `FFFFFF`, `#FFFFFF`.

Rejected formats:
- Named CSS colours (`white`, `red`, …).
- Functional notation (`rgb()`, `rgba()`, `hsl()`, …).
- 8-character RGBA hex (`#rrggbbaa`).
- Any string with characters outside `[0-9a-fA-F]`.

The canonical output is always a lowercase 7-character string: `#rrggbb`.

---

## Background mode behaviour

### `template` (default)

The background is rendered by placing the template image asset identified by `background__template` (or its default) as the first node. Text colours are derived from the template's declared text theme (`LIGHT` or `DARK`).

### `solid`

The background is rendered as a filled rectangle (`fill-rect` node) covering the entire canvas. The colour is taken from `background__color`.

When `solid` mode is active, the fallback text colour for all roles is **white** (`rgba(255,255,255,1)`), since the template text theme is irrelevant. Role-specific overrides via `text__primary_color` etc. still apply on top.

---

## Text color role mapping

Each layout maps its text elements to one of three roles:

| Role | Resource | Author | Server | Member | Team |
|---|---|---|---|---|---|
| **primary** | resource name | author name | server name | member name | team name |
| **secondary** | author, reviews, downloads, price | resource count, likes, downloads, reviews | version, motd, players | rank, joined, posts, likes | resource count, downloads, ratings |
| **accent** | *(unused)* | *(unused)* | *(unused)* | *(unused)* | *(unused)* |

If a role override is absent, the role inherits the base colour (white for `solid`, or the template-derived colour for `template`).

---

## Shadow preset values

| Preset | `offsetX` | `offsetY` | `blur` | `color` |
|---|---|---|---|---|
| `none` | — | — | — | — (no shadow) |
| `soft` | `1` | `1` | `2` | `rgba(0,0,0,0.45)` |
| `strong` | `2` | `2` | `4` | `rgba(0,0,0,0.75)` |

Shadow is applied to all text nodes produced by the layout builder. The canvas shadow state is reset after each text draw call to avoid bleed-through to non-text nodes.

---

## Logo Y offset semantics

The logo is normally centred vertically: `floor((bannerHeight - logoSize) / 2)`.

`logo__y` is an **additive offset** applied after this calculation:

```
logoY = floor((bannerHeight - logoSize) / 2) + logoYOffset
```

Positive values move the logo downward; negative values move it upward. The value is clamped to `[-50, 50]`.

---

## Validation behaviour

### Forgiving parse (`parseBannerStyleSettings`)

Used for rendering. Returns `null` if no style keys are present (legacy path). If style keys are present:

- Unknown `style__version` (anything other than `1`) → returns `null` (falls back to legacy rendering).
- Invalid `background__mode` → silently falls back to `"template"`.
- Invalid hex colour → stored as `null` (role uses fallback colour).
- Invalid `shadow__preset` → stored as `null` (no shadow applied).
- Invalid or out-of-range `logo__y` → defaults to `0`.

### Strict validate (`validateBannerStyleSettings`)

Used for save/preview validation paths. Returns an array of `StyleValidationError` objects. An empty array means valid.

| Error code | Condition |
|---|---|
| `UNSUPPORTED_STYLE_VERSION` | `style__version` present and not `"1"` |
| `INVALID_BACKGROUND_MODE` | `background__mode` present and not `template`/`solid` |
| `MISSING_BACKGROUND_COLOR` | `background__mode=solid` and `background__color` absent |
| `INVALID_HEX_COLOR` | Any colour key present with an invalid hex value |
| `INVALID_SHADOW_PRESET` | `shadow__preset` present and not a valid preset name |
| `INVALID_LOGO_Y` | `logo__y` present and not a valid integer or outside `[-50, 50]` |

Early return: if `UNSUPPORTED_STYLE_VERSION` fires, no further validation is performed.

---

## Canonicalization (`canonicalizeBannerStyleSettings`)

Normalises a settings map by removing default/no-op values. The resulting map contains only the keys that differ from defaults:

- `background.mode = "template"` → omitted.
- `logoYOffset = 0` → omitted.
- `null` colour values → omitted.
- `shadowPreset = null` → omitted.

`style__version=1` is included if and only if at least one other style key survives.

---

## Examples

### Solid red background with white primary text and a soft shadow

```
background__mode=solid
background__color=%23ff0000
text__primary_color=%23ffffff
shadow__preset=soft
```

### Template background, adjusted logo position

```
logo__y=-10
```

### Solid background with 3-char hex shorthand

```
background__mode=solid
background__color=f00
```

---

## Compatibility

Style settings are additive and versioned. Requests without any `style__*`, `background__*`, `text__*`, `shadow__*`, or `logo__*` keys follow the legacy rendering path exactly, with no behavioural difference.
