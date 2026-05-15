import { Hono } from "hono";
import type { ResourceClient } from "@mcbanners/external-clients";
import type { MemoryCache } from "@mcbanners/cache";
import {
  buildResourceBannerNodes,
  parseResourceBannerSettings,
  RESOURCE_BANNER_WIDTH,
  RESOURCE_BANNER_HEIGHT,
  createCanvasSurface,
  encodePng,
  encodeJpg,
  renderNode,
  registerRendererFonts
} from "@mcbanners/banner-renderer";

/** Matches `banner.png` or `banner.jpg` (case-insensitive). */
const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;

/** TTL for cached rendered banner images (60 seconds). */
const BANNER_CACHE_TTL_MS = 60_000;

const buildBannerCacheKey = (
  platform: string,
  id: string,
  outputType: string,
  rawQuery: Record<string, string>
): string => {
  const queryKey = Object.entries(rawQuery)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `banner:resource:${platform.toLowerCase()}:${id.toLowerCase()}:${outputType.toLowerCase()}:${queryKey}`;
};

export type ResourceClients = Record<string, ResourceClient>;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

export const createResourceBannerRoute = (
  clients: ResourceClients,
  bannerCache?: MemoryCache
): Hono => {
  const route = new Hono();

  route.get("/:platform/:id/isValid", async (c) => {
    const { platform: rawPlatform, id } = c.req.param();
    const platform = rawPlatform.toUpperCase();
    const client = clients[platform];
    if (client === undefined) {
      return c.json({ valid: false });
    }
    const data = await client.getResourceBannerData(id);
    return c.json({ valid: data !== null });
  });

  route.get("/:platform/:id/:bannerFile", async (c) => {
    const { platform: rawPlatform, id, bannerFile } = c.req.param();
    const platform = rawPlatform.toUpperCase();
    const client = clients[platform];
    if (client === undefined) {
      return c.json(
        { error: `Unsupported platform: ${rawPlatform}. Supported: SPIGOT, MODRINTH.` },
        404
      );
    }

    const match = BANNER_FILENAME_RE.exec(bannerFile);
    if (!match?.[1]) {
      return c.json(
        { error: `Unsupported filename: ${bannerFile}. Expected banner.png or banner.jpg.` },
        400
      );
    }
    const outputType = match[1].toLowerCase();

    const data = await client.getResourceBannerData(id);
    if (data === null) {
      return c.body(null, 404);
    }

    ensureFonts();

    const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries());

    const renderBanner = async (): Promise<Buffer> => {
      const settings = parseResourceBannerSettings(rawQuery);
      const nodes = buildResourceBannerNodes(data, settings);
      const surface = createCanvasSurface(RESOURCE_BANNER_WIDTH, RESOURCE_BANNER_HEIGHT);
      for (const node of nodes) {
        await renderNode(surface, node);
      }
      return outputType === "jpg" ? encodeJpg(surface) : encodePng(surface);
    };

    const buf =
      bannerCache !== undefined
        ? await bannerCache.getOrSet<Buffer>(
            buildBannerCacheKey(platform, id, outputType, rawQuery),
            renderBanner,
            { ttlMs: BANNER_CACHE_TTL_MS, byteEstimate: (b) => b.length }
          )
        : await renderBanner();

    const contentType = outputType === "jpg" ? "image/jpeg" : "image/png";
    return new Response(buf, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  });

  return route;
};
