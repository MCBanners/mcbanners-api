export interface ImageNode {
  readonly type: "image";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** Asset manifest key for bundled background templates or pre-loaded sprites. */
  readonly assetKey?: string;
  /** Base64-encoded PNG or JPG bytes for externally-loaded images. */
  readonly imageData?: string;
}
