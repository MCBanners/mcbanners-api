#!/usr/bin/env bun
/**
 * Renders all server banner fixtures to packages/banner-renderer/output/server/
 *
 * Usage:
 *   bun packages/banner-renderer/scripts/render-server-fixture.ts
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createCanvasSurface,
  encodeJpg,
  encodePng,
  registerRendererFonts,
  renderNode
} from "../src";
import {
  DEFAULT_SERVER_BANNER_SETTINGS,
  SERVER_BANNER_HEIGHT,
  SERVER_BANNER_WIDTH,
  buildServerBannerNodes
} from "../src/layouts/server";
import { ALL_FIXTURES } from "../test/fixtures/server-fixtures";

const outputDir = join(import.meta.dir, "..", "output", "server");

registerRendererFonts();
await mkdir(outputDir, { recursive: true });

for (const { label, fixture } of ALL_FIXTURES) {
  const nodes = buildServerBannerNodes(fixture, DEFAULT_SERVER_BANNER_SETTINGS);
  const surface = createCanvasSurface(SERVER_BANNER_WIDTH, SERVER_BANNER_HEIGHT);

  for (const node of nodes) {
    await renderNode(surface, node);
  }

  const png = await encodePng(surface);
  const jpg = await encodeJpg(surface);

  await writeFile(join(outputDir, `${label}.png`), png);
  await writeFile(join(outputDir, `${label}.jpg`), jpg);

  console.log(`[${label}] PNG=${String(png.length)} bytes  JPG=${String(jpg.length)} bytes`);
}

console.log(`\nOutput written to: ${outputDir}`);
