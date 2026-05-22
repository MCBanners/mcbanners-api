import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";

import {
  type AssetReference,
  rendererAssetManifest,
  resolveAssetPath,
  validateAssetFiles
} from "../assets";

export interface CanvasSpikeResult {
  readonly png: Buffer;
  readonly jpg: Buffer;
  readonly wroteOutputFiles: boolean;
  readonly outputDirectory: string;
}

export const canvasSpikeFontFamily = "MCBanners Canvas Spike Inter";
export const canvasSpikeWidth = 468;
export const canvasSpikeHeight = 60;
export const canvasSpikeOutputDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../output/canvas-spike"
);

const requiredAssetByKey = (key: string): AssetReference => {
  const asset = rendererAssetManifest.assets.find((candidate) => candidate.key === key);

  if (asset === undefined) {
    throw new Error(`Missing canvas spike asset: ${key}`);
  }

  return asset;
};

export const registerCanvasSpikeFont = (): void => {
  const font = requiredAssetByKey("InterRegular");
  const fontKey = GlobalFonts.registerFromPath(resolveAssetPath(font), canvasSpikeFontFamily);

  if (fontKey === null) {
    throw new Error(`Failed to register canvas spike font: ${font.relativePath}`);
  }
};

export const createCanvasSpike = async (): Promise<{
  readonly png: Buffer;
  readonly jpg: Buffer;
}> => {
  await validateAssetFiles(rendererAssetManifest);
  registerCanvasSpikeFont();

  const background = await loadImage(resolveAssetPath(requiredAssetByKey("BLUE_RADIAL")));
  const sprite = await loadImage(resolveAssetPath(requiredAssetByKey("STAR_FULL")));
  const canvas = createCanvas(canvasSpikeWidth, canvasSpikeHeight);
  const context = canvas.getContext("2d");

  context.drawImage(background, 0, 0, canvasSpikeWidth, canvasSpikeHeight);
  context.fillStyle = "rgba(0, 0, 0, 0.28)";
  context.fillRect(0, 0, canvasSpikeWidth, canvasSpikeHeight);
  context.drawImage(sprite, 18, 17, 24, 24);
  context.font = `20px "${canvasSpikeFontFamily}"`;
  context.fillStyle = "#ffffff";
  context.fillText("MCBanners canvas spike", 56, 37);

  const png = await canvas.encode("png");
  const jpg = await canvas.encode("jpeg", 90);

  return { png, jpg };
};

export const writeCanvasSpikeOutputs = async (
  outputDirectory = canvasSpikeOutputDirectory
): Promise<CanvasSpikeResult> => {
  const { png, jpg } = await createCanvasSpike();

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(resolve(outputDirectory, "canvas-spike.png"), png);
  await writeFile(resolve(outputDirectory, "canvas-spike.jpg"), jpg);

  return {
    png,
    jpg,
    wroteOutputFiles: true,
    outputDirectory
  };
};
