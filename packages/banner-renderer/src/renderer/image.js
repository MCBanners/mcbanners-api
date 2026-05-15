import { loadImage } from "@napi-rs/canvas";
import { rendererAssetManifest, resolveAssetPath } from "../assets";
const loadManifestImage = async (assetKey) => {
    const asset = rendererAssetManifest.assets.find((a) => a.key === assetKey);
    if (asset === undefined) {
        throw new Error(`Image asset not found in manifest: ${assetKey}`);
    }
    return loadImage(resolveAssetPath(asset));
};
/**
 * Draws an image node onto the surface. The image source is either a bundled
 * asset (via `assetKey`) or pre-loaded bytes encoded as base64 (`imageData`).
 * Exactly one of those fields must be present.
 */
export const renderImageNode = async (surface, node) => {
    if (node.assetKey === undefined && node.imageData === undefined) {
        throw new Error("ImageNode requires either assetKey or imageData");
    }
    const image = node.assetKey !== undefined
        ? await loadManifestImage(node.assetKey)
        : await loadImage(Buffer.from(node.imageData, "base64"));
    surface.context.drawImage(image, node.x, node.y, node.width, node.height);
};
/**
 * Draws a sprite onto the surface. Sprites always reference bundled assets by
 * manifest key.
 */
export const renderSpriteNode = async (surface, node) => {
    const image = await loadManifestImage(node.assetKey);
    surface.context.drawImage(image, node.x, node.y, node.width, node.height);
};
