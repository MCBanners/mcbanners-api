# 007 Renderer Asset Inventory

Milestone 3a copies the legacy renderer assets into `mcbanners-api-next` and
pins them with deterministic SHA-256 hashes. The files remain byte-for-byte
legacy compatibility assets; no optimization, decoding, or renderer porting has
been done yet.

## Asset Categories

| Category                   | Legacy source                              | Copied target                             | Count |
| -------------------------- | ------------------------------------------ | ----------------------------------------- | ----- |
| Background templates       | `../banner-api/src/main/resources/banner`  | `packages/banner-renderer/assets/banner`  | 11    |
| Fonts                      | `../banner-api/src/main/resources/fonts`   | `packages/banner-renderer/assets/fonts`   | 16    |
| Sprites and fallback logos | `../banner-api/src/main/resources/sprites` | `packages/banner-renderer/assets/sprites` | 12    |

The typed manifest and validation utilities live at
`packages/banner-renderer/src/assets/index.ts`.

## Background Templates

Legacy source files:

- `banner/blue_radial.png`
- `banner/burning_orange.png`
- `banner/dark_gunmetal.png`
- `banner/light_mode.png`
- `banner/malachite_green.png`
- `banner/mango.png`
- `banner/moonlight_purple.png`
- `banner/orange_radial.png`
- `banner/purple_taupe.png`
- `banner/velvet.png`
- `banner/yellow.png`

These are loaded by `BackgroundTemplate.getImage()` from `/banner/{template}.png`.

## Fonts

Legacy source files:

- `fonts/InterBold.ttf`
- `fonts/InterRegular.ttf`
- `fonts/JetbrainsMonoBold.ttf`
- `fonts/JetbrainsMonoRegular.ttf`
- `fonts/MontserratBold.ttf`
- `fonts/MontserratRegular.ttf`
- `fonts/OpenSansBold.ttf`
- `fonts/OpenSansRegular.ttf`
- `fonts/PoppinsBold.ttf`
- `fonts/PoppinsRegular.ttf`
- `fonts/RalewayBold.ttf`
- `fonts/RalewayRegular.ttf`
- `fonts/RobotoBold.ttf`
- `fonts/RobotoRegular.ttf`
- `fonts/SourceSansProBold.ttf`
- `fonts/SourceSansProRegular.ttf`

These correspond to `FontFace.getFileName(boolean bold)`.

## Sprites And Fallback Logos

Legacy source files:

- `sprites/default_author_logo.png`
- `sprites/default_builtbybit_res_logo.png`
- `sprites/default_curseforge_res_logo.png`
- `sprites/default_hangar_res_logo.png`
- `sprites/default_modrinth_res_logo.png`
- `sprites/default_polymart_res_logo.png`
- `sprites/default_server_logo.png`
- `sprites/default_spigot_res_logo.png`
- `sprites/default_sponge_res_logo.png`
- `sprites/star_full.png`
- `sprites/star_half.png`
- `sprites/star_none.png`

These are loaded by `Sprite.getImage()` from `/sprites/{sprite}.png`. Layouts also accept remote/base64 logos from platform data; these are not bundled assets.

## Copied Status

All assets found in the legacy renderer resource directories were copied to the
new package target layout:

- `packages/banner-renderer/assets/banner`
- `packages/banner-renderer/assets/fonts`
- `packages/banner-renderer/assets/sprites`

The manifest preserves legacy filenames and records each asset key, kind,
relative path, expected extension, required status, byte size, legacy source path,
and expected SHA-256 hash.

## Missing Or Uncertain Assets

- No other bundled renderer images were found under `banner-api/src/main/resources`.
- Remote platform logos, Minecraft server icons, Discord avatars, and inline base64 images are runtime inputs rather than copied static assets.
- The legacy app may rely on classpath resource loading semantics; the next renderer should use explicit filesystem or packaged asset paths.

## Startup Validation Expectations

Startup-style validation is implemented through:

- `validateAssetManifest()`
- `validateAssetFiles()`
- `computeAssetSha256()`
- `resolveAssetPath()`

Validation currently:

- Ensure every manifest asset exists at the configured target path.
- Verifies required assets are files.
- Verifies recorded byte sizes.
- Verifies SHA-256 hashes.
- Rejects duplicate asset keys.
- Rejects unsupported or mismatched asset extensions.
- Verify all manifest target paths are inside `packages/banner-renderer/assets`.
- Fail fast with a clear asset id and path when validation fails.

Future renderer startup validation should also verify that each image/font can be
decoded or registered by the selected canvas runtime.

## Asset Version And Hash Strategy

Copied assets are pinned by SHA-256 in the manifest and checked in tests. Any
future asset update must be an explicit compatibility decision: copy the new file,
review the binary diff/source, update the byte size and hash, and explain why the
visual output change is intended.

## Copy Decision

Milestone 3a copies binaries because the canvas spike and future renderer startup
checks need local files for deterministic font registration, image decoding, and
fixture generation. `@napi-rs/canvas` has not been added yet.
