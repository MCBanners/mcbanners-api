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

/**
 * Splits the wildcard path segment (everything after `/:platform/`) into an
 * id and an action (either `isValid` or a banner filename like `banner.png`).
 *
 * Example: `"12345/banner.png"` → `{ id: "12345", action: "banner.png" }`
 * Example: `"author/slug/isValid"` → `{ id: "author/slug", action: "isValid" }`
 *
 * This two-part split allows Hangar IDs (`author/slug`) to coexist with
 * single-segment IDs (Spigot numeric ids, Modrinth slugs, etc.).
 */
const splitWildcard = (wildcard: string): { id: string; action: string } | null => {
  const slashIdx = wildcard.lastIndexOf("/");
  if (slashIdx === -1) return null;
  return {
    id: wildcard.slice(0, slashIdx),
    action: wildcard.slice(slashIdx + 1)
  };
};

export const createResourceBannerRoute = (
  clients: ResourceClients,
  bannerCache?: MemoryCache
): Hono => {
  const route = new Hono();

  /**
   * Unified wildcard handler for both `isValid` and `banner.(png|jpg)`.
   *
   * Mounted at `/:platform/*`, so we extract the sub-path from `c.req.path`
   * after stripping the platform prefix:
   *   `/banner/resource/spigot/12345/banner.png` → sub-path `12345/banner.png`
   *   `/banner/resource/hangar/author/slug/isValid` → sub-path `author/slug/isValid`
   */
  route.get("/:platform/*", async (c) => {
    const { platform: rawPlatform } = c.req.param();
    const platform = rawPlatform.toUpperCase();
    const client = clients[platform];

    // Extract the sub-path that follows the platform segment.
    // We use the full URL pathname because c.req.path may include the mount prefix.
    const url = new URL(c.req.url);
    const segments = url.pathname.split("/").filter((s) => s.length > 0);
    // rawPlatform came from Hono's matched :platform param, so find the first
    // occurrence of that exact segment in the path (path is case-preserving).
    let platformIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (segments[i] === rawPlatform) {
        platformIdx = i;
        break;
      }
    }
    if (platformIdx === -1) {
      return c.json({ error: "Not found" }, 404);
    }
    const remainder = segments.slice(platformIdx + 1).join("/");

    const parts = splitWildcard(remainder);
    if (parts === null) {
      return c.json({ error: "Not found" }, 404);
    }
    const { id, action } = parts;

    // ---- isValid ----
    if (action === "isValid") {
      if (client === undefined) {
        return c.json({ valid: false });
      }
      const normalizedId = id.toLowerCase();
      const data = await client.getResourceBannerData(normalizedId);
      const res = c.json({ valid: data !== null });
      res.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res;
    }

    // ---- banner image ----
    const match = BANNER_FILENAME_RE.exec(action);
    if (!match?.[1]) {
      return c.json(
        { error: `Unsupported filename: ${action}. Expected banner.png or banner.jpg.` },
        400
      );
    }

    if (client === undefined) {
      return c.json({ error: `Unsupported platform: ${rawPlatform}.` }, 404);
    }

    const outputType = match[1].toLowerCase();
    const normalizedId = id.toLowerCase();
    const data = await client.getResourceBannerData(normalizedId);
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
            buildBannerCacheKey(platform, normalizedId, outputType, rawQuery),
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
