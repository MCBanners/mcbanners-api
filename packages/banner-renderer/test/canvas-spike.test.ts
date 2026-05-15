import { describe, expect, test } from "bun:test";

import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import { createCanvas } from "@napi-rs/canvas";

import { validateAssetFiles } from "@mcbanners/banner-renderer";
import {
  createCanvasSpike,
  registerCanvasSpikeFont,
  writeCanvasSpikeOutputs
} from "@mcbanners/banner-renderer/canvas/spike";

const pngSignature = [0x89, 0x50, 0x4e, 0x47] as const;
const jpgSignature = [0xff, 0xd8, 0xff] as const;

describe("canvas spike", () => {
  test("creates a canvas with @napi-rs/canvas under Bun", () => {
    const canvas = createCanvas(16, 16);

    expect(canvas.width).toBe(16);
    expect(canvas.height).toBe(16);
    expect(canvas.getContext("2d")).toBeDefined();
  });

  test("validates copied assets before rendering", async () => {
    const manifest = await validateAssetFiles();

    expect(manifest.assets).toHaveLength(39);
  });

  test("registers a copied font without throwing", () => {
    expect(() => {
      registerCanvasSpikeFont();
    }).not.toThrow();
  });

  test("renders non-empty PNG and JPG bytes", async () => {
    const { png, jpg } = await createCanvasSpike();

    expect(png.length).toBeGreaterThan(0);
    expect(jpg.length).toBeGreaterThan(0);
    expect([...png.subarray(0, pngSignature.length)]).toEqual([...pngSignature]);
    expect([...jpg.subarray(0, jpgSignature.length)]).toEqual([...jpgSignature]);
  });

  test("writes generated outputs to the ignored spike output directory", async () => {
    const result = await writeCanvasSpikeOutputs();
    const pngStat = await stat(resolve(result.outputDirectory, "canvas-spike.png"));
    const jpgStat = await stat(resolve(result.outputDirectory, "canvas-spike.jpg"));

    expect(result.wroteOutputFiles).toBe(true);
    expect(pngStat.size).toBe(result.png.length);
    expect(jpgStat.size).toBe(result.jpg.length);
  });
});
