#!/usr/bin/env bun
/**
 * render-resource-fixture.ts
 *
 * Local-only script to visually inspect resource banner rendering from fixtures.
 * Does not make network calls or require any running services.
 *
 * Usage:
 *   bun run scripts/render-resource-fixture.ts [fixtureName] [outputDir]
 *
 * Available fixtures:
 *   spigot-free (default), spigot-premium, modrinth, curseforge,
 *   hangar, no-logo, long-name, unicode
 *
 * Example:
 *   bun run scripts/render-resource-fixture.ts spigot-premium ./tmp/render-out
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createCanvasSurface,
  encodeJpg,
  encodePng,
  registerRendererFonts,
  renderNode
} from "../packages/banner-renderer/src";
import {
  buildResourceBannerNodes,
  DEFAULT_RESOURCE_BANNER_SETTINGS,
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_WIDTH
} from "../packages/banner-renderer/src/layouts/resource";

const FIXTURES: Record<
  string,
  () => Promise<import("../packages/banner-renderer/src/layouts/resource").ResourceBannerData>
> = {
  "spigot-free": async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures"))
      .FIXTURE_SPIGOT_FREE,
  "spigot-premium": async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures"))
      .FIXTURE_SPIGOT_PREMIUM,
  modrinth: async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures")).FIXTURE_MODRINTH,
  curseforge: async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures"))
      .FIXTURE_CURSEFORGE,
  hangar: async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures")).FIXTURE_HANGAR,
  "no-logo": async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures")).FIXTURE_NO_LOGO,
  "long-name": async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures")).FIXTURE_LONG_NAME,
  unicode: async () =>
    (await import("../packages/banner-renderer/test/fixtures/resource-fixtures")).FIXTURE_UNICODE
};

const fixtureName = process.argv[2] ?? "spigot-free";
const outputDir = process.argv[3] ?? join(import.meta.dir, "..", "tmp", "resource-render-out");

const loadFixture = FIXTURES[fixtureName];
if (!loadFixture) {
  console.error(`Unknown fixture: ${fixtureName}`);
  console.error(`Available: ${Object.keys(FIXTURES).join(", ")}`);
  process.exit(1);
}

const fixture = await loadFixture();

registerRendererFonts();
const nodes = buildResourceBannerNodes(fixture, DEFAULT_RESOURCE_BANNER_SETTINGS);
const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);

for (const node of nodes) {
  await renderNode(surface, node);
}

const png = await encodePng(surface);
const jpg = await encodeJpg(surface);

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, `${fixtureName}.png`), png);
await writeFile(join(outputDir, `${fixtureName}.jpg`), jpg);

console.log(`Rendered fixture: ${fixtureName}`);
console.log(`  PNG: ${png.byteLength} bytes → ${join(outputDir, `${fixtureName}.png`)}`);
console.log(`  JPG: ${jpg.byteLength} bytes → ${join(outputDir, `${fixtureName}.jpg`)}`);
console.log(`  Nodes: ${String(nodes.length)}`);
console.log(`  Backend: ${fixture.backend}`);
console.log(`  Resource: ${fixture.resource.name} by ${fixture.author.name}`);
