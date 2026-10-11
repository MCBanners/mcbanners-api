import { loadImage } from "@napi-rs/canvas";
import { rendererAssetManifest, resolveAssetPath } from "../assets";
import type { ImageNode } from "../nodes/image-node";
import type { SpriteNode } from "../nodes/sprite-node";
import type { RenderSurface } from "../types/render-surface";
import { BoundedAsyncCache } from "./bounded-async-cache";

const decodedManifestImages = new BoundedAsyncCache<Awaited<ReturnType<typeof loadImage>>>(
  32 * 1024 * 1024,
  (image) => image.width * image.height * 4
);
const decodedInlineImages = new BoundedAsyncCache<{
  readonly image: Awaited<ReturnType<typeof loadImage>>;
  readonly encodedBytes: number;
}>(8 * 1024 * 1024, ({ image, encodedBytes }) => image.width * image.height * 4 + encodedBytes, 32);

const loadManifestImage = async (assetKey: string): ReturnType<typeof loadImage> => {
  const asset = rendererAssetManifest.assets.find((a) => a.key === assetKey);

  if (asset === undefined) {
    throw new Error(`Image asset not found in manifest: ${assetKey}`);
  }

  const path = resolveAssetPath(asset);
  return asset.kind === "font"
    ? loadImage(path)
    : decodedManifestImages.get(assetKey, () => loadImage(path));
};

/**
 * Draws an image node onto the surface. The image source is either a bundled
 * asset (via `assetKey`) or pre-loaded bytes encoded as base64 (`imageData`).
 * Exactly one of those fields must be present.
 */
export const renderImageNode = async (surface: RenderSurface, node: ImageNode): Promise<void> => {
  if (node.assetKey === undefined && node.imageData === undefined) {
    throw new Error("ImageNode requires either assetKey or imageData");
  }

  const image =
    node.assetKey !== undefined
      ? await loadManifestImage(node.assetKey)
      : (
          await decodedInlineImages.get(node.imageData!, async () => ({
            image: await loadImage(Buffer.from(node.imageData!, "base64")),
            encodedBytes: node.imageData!.length * 2
          }))
        ).image;

  surface.context.drawImage(image, node.x, node.y, node.width, node.height);
};

/**
 * Draws a sprite onto the surface. Sprites always reference bundled assets by
 * manifest key.
 */
export const renderSpriteNode = async (surface: RenderSurface, node: SpriteNode): Promise<void> => {
  const image = await loadManifestImage(node.assetKey);
  surface.context.drawImage(image, node.x, node.y, node.width, node.height);
};
