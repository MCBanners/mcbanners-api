#!/usr/bin/env bun
/**
 * render-all-resource-fixtures.ts
 *
 * Renders every resource banner fixture (all platforms) to an output folder and
 * prints a byte-size summary.  Useful for visually inspecting rendering correctness
 * across all supported backends without needing network access.
 *
 * Output is written to output/resource-corpus/ (git-ignored).
 *
 * Usage:
 *   bun run scripts/render-all-resource-fixtures.ts [outputDir]
 *
 * Example:
 *   bun run scripts/render-all-resource-fixtures.ts ./tmp/corpus
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
import { ALL_RESOURCE_FIXTURES } from "../packages/banner-renderer/test/fixtures/resource-fixtures";

const outputDir = process.argv[2] ?? join(import.meta.dir, "..", "output", "resource-corpus");

registerRendererFonts();
await mkdir(outputDir, { recursive: true });

interface CorpusEntry {
  label: string;
  backend: string;
  resource: string;
  author: string;
  pngBytes: number;
  jpgBytes: number;
  nodeCount: number;
}

const results: CorpusEntry[] = [];

for (const { label, fixture } of ALL_RESOURCE_FIXTURES) {
  const nodes = buildResourceBannerNodes(fixture, DEFAULT_RESOURCE_BANNER_SETTINGS);
  const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);
  for (const node of nodes) {
    await renderNode(surface, node);
  }
  const png = await encodePng(surface);
  const jpg = await encodeJpg(surface);

  await writeFile(join(outputDir, `${label}.png`), png);
  await writeFile(join(outputDir, `${label}.jpg`), jpg);

  results.push({
    label,
    backend: fixture.backend,
    resource: fixture.resource.name,
    author: fixture.author.name,
    pngBytes: png.byteLength,
    jpgBytes: jpg.byteLength,
    nodeCount: nodes.length
  });
}

// Print summary table
const padRight = (s: string, n: number): string => s.padEnd(n);
const padLeft = (s: string, n: number): string => s.padStart(n);

console.log("");
console.log("Resource banner corpus — render summary");
console.log("Output:", outputDir);
console.log("");
console.log(
  `${padRight("Fixture", 28)} ${padRight("Backend", 12)} ${padLeft("PNG bytes", 10)} ${padLeft("JPG bytes", 10)} ${padLeft("Nodes", 6)}`
);
console.log("-".repeat(72));
for (const r of results) {
  console.log(
    `${padRight(r.label, 28)} ${padRight(r.backend, 12)} ${padLeft(String(r.pngBytes), 10)} ${padLeft(String(r.jpgBytes), 10)} ${padLeft(String(r.nodeCount), 6)}`
  );
}
console.log("-".repeat(72));
console.log(`Total fixtures: ${String(results.length)}`);
const totalPng = results.reduce((s, r) => s + r.pngBytes, 0);
const totalJpg = results.reduce((s, r) => s + r.jpgBytes, 0);
console.log(`Total PNG bytes: ${String(totalPng)}`);
console.log(`Total JPG bytes: ${String(totalJpg)}`);
console.log("");
