# 007 Renderer Asset Inventory

Milestone 3 prep inventories legacy renderer assets only. No binary assets were copied into `mcbanners-api-next`.

## Asset Categories

| Category                   | Legacy source                              | Expected target                           | Count |
| -------------------------- | ------------------------------------------ | ----------------------------------------- | ----- |
| Background templates       | `../banner-api/src/main/resources/banner`  | `packages/banner-renderer/assets/banner`  | 11    |
| Fonts                      | `../banner-api/src/main/resources/fonts`   | `packages/banner-renderer/assets/fonts`   | 16    |
| Sprites and fallback logos | `../banner-api/src/main/resources/sprites` | `packages/banner-renderer/assets/sprites` | 12    |

The typed inventory lives at `packages/banner-renderer/src/assets/index.ts`.

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

## Missing Or Uncertain Assets

- No other bundled renderer images were found under `banner-api/src/main/resources`.
- Remote platform logos, Minecraft server icons, Discord avatars, and inline base64 images are runtime inputs rather than copied static assets.
- The legacy app may rely on classpath resource loading semantics; the next renderer should use explicit filesystem or packaged asset paths.

## Startup Validation Expectations

Before production renderer adoption, startup validation should:

- Ensure every manifest asset exists at the configured target path.
- Verify byte size is non-zero.
- Verify each image/font can be decoded or registered by the selected canvas runtime.
- Verify all manifest target paths are inside `packages/banner-renderer/assets`.
- Fail fast with a clear asset id and path when validation fails.

## Asset Version And Hash Strategy

Use SHA-256 hashes for copied assets. The next milestone should generate and commit hashes in the manifest at copy time, then validate them in startup checks and tests. Keep the copied asset set exact until visual fixture comparisons prove intentional changes.

## Copy Decision

Do not copy binaries in this prep milestone. Copying should happen in the canvas spike milestone if the spike needs local files for font registration and image decoding.
