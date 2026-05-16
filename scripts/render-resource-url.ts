#!/usr/bin/env bun
/**
 * render-resource-url.ts
 *
 * Manual script that fetches a live resource from Spigot or Modrinth and
 * renders its banner to a local PNG/JPEG file.  Requires a real network
 * connection — do NOT run this in automated tests.
 *
 * Usage:
 *   bun run scripts/render-resource-url.ts <platform> <id> [outputType] [outputDir]
 *
 * Arguments:
 *   platform   — spigot | modrinth | curseforge | hangar | ore  (case-insensitive)
 *   id         — platform-specific resource ID
 *                Hangar: "author/slug" (e.g. "papermc/eternal-light")
 *                Spigot: numeric ID
 *                Modrinth: project slug or ID
 *                CurseForge: numeric CurseForge project ID
 *                Ore: plugin ID (e.g. "nucleus")
 *   outputType — png (default) | jpg
 *   outputDir  — output directory (default: ./tmp/resource-url-out)
 *
 * Examples:
 *   bun run scripts/render-resource-url.ts spigot 12345
 *   bun run scripts/render-resource-url.ts modrinth sodium jpg
 *   bun run scripts/render-resource-url.ts curseforge 32274
 *   bun run scripts/render-resource-url.ts hangar "papermc/eternal-light"
 *   bun run scripts/render-resource-url.ts ore nucleus
 *   bun run scripts/render-resource-url.ts builtbybit 12345         # requires BUILTBYBIT_API_KEY
 *   bun run scripts/render-resource-url.ts polymart 123
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  SpigotResourceClient,
  ModrinthResourceClient,
  CurseForgeResourceClient,
  HangarResourceClient,
  OreResourceClient,
  BuiltByBitResourceClient,
  PolymartResourceClient,
  type ResourceClient
} from "../packages/external-clients/src";
import {
  buildResourceBannerNodes,
  DEFAULT_RESOURCE_BANNER_SETTINGS,
  RESOURCE_BANNER_HEIGHT,
  RESOURCE_BANNER_WIDTH
} from "../packages/banner-renderer/src/layouts/resource";
import {
  createCanvasSurface,
  encodeJpg,
  encodePng,
  registerRendererFonts,
  renderNode
} from "../packages/banner-renderer/src";

const [, , rawPlatform, rawId, rawOutputType, rawOutputDir] = process.argv;

if (!rawPlatform || !rawId) {
  console.error(
    "Usage: bun run scripts/render-resource-url.ts <platform> <id> [png|jpg] [outputDir]"
  );
  console.error(
    "  platform: spigot | modrinth | curseforge | hangar | ore | builtbybit | polymart"
  );
  process.exit(1);
}

const platform = rawPlatform.toLowerCase();
const id = rawId.toLowerCase();
const outputType = (rawOutputType ?? "png").toLowerCase();
const outputDir = rawOutputDir ?? join(import.meta.dir, "..", "tmp", "resource-url-out");

if (outputType !== "png" && outputType !== "jpg") {
  console.error(`Unsupported output type: ${outputType}. Use png or jpg.`);
  process.exit(1);
}

const clientMap: Record<string, ResourceClient> = {
  spigot: new SpigotResourceClient(),
  modrinth: new ModrinthResourceClient(),
  curseforge: new CurseForgeResourceClient(),
  hangar: new HangarResourceClient(),
  ore: new OreResourceClient(),
  builtbybit: new BuiltByBitResourceClient(
    process.env["BUILTBYBIT_API_KEY"] ? { apiKey: process.env["BUILTBYBIT_API_KEY"] } : {}
  ),
  polymart: new PolymartResourceClient()
};

const client = clientMap[platform];
if (client === undefined) {
  console.error(
    `Unknown platform: ${rawPlatform}. Supported: spigot, modrinth, curseforge, hangar, ore, builtbybit, polymart`
  );
  process.exit(1);
}

console.log(`Fetching ${platform}/${id} ...`);
const data = await client.getResourceBannerData(id);

if (data === null) {
  console.error(`Resource not found: ${platform}/${id}`);
  process.exit(1);
}

console.log(`  Resource : ${data.resource.name}`);
console.log(`  Author   : ${data.author.name}`);
console.log(`  Downloads: ${String(data.resource.downloadCount)}`);
console.log(`  Premium  : ${String(data.resource.price !== null)}`);
console.log(`  Logo     : ${data.resource.logoBase64 !== null ? "present" : "absent"}`);

registerRendererFonts();
const nodes = buildResourceBannerNodes(data, DEFAULT_RESOURCE_BANNER_SETTINGS);
const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);

for (const node of nodes) {
  await renderNode(surface, node);
}

const buf = outputType === "jpg" ? await encodeJpg(surface) : await encodePng(surface);
const filename = `resource-${platform}-${id}.${outputType}`;

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, filename), buf);

console.log(`\nRendered → ${join(outputDir, filename)}  (${String(buf.byteLength)} bytes)`);
console.log(`  Nodes: ${String(nodes.length)}`);
