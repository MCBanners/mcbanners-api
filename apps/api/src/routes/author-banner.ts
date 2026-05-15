import { Hono } from "hono";
import type { MemoryCache } from "@mcbanners/cache";
import { normalizeResourceId, type AuthorClient } from "@mcbanners/external-clients";
import {
  AUTHOR_BANNER_HEIGHT,
  AUTHOR_BANNER_WIDTH,
  buildAuthorBannerNodes,
  createCanvasSurface,
  encodeJpg,
  encodePng,
  parseAuthorBannerSettings,
  registerRendererFonts,
  renderNode
} from "@mcbanners/banner-renderer";
import { extractRouteRemainder, parseResourceRoutePath } from "./resource-route-parser";

const BANNER_FILENAME_RE = /^banner\.(png|jpg)$/i;
const BANNER_CACHE_TTL_MS = 60_000;

export type AuthorClients = Record<string, AuthorClient>;

let fontsRegistered = false;
const ensureFonts = (): void => {
  if (!fontsRegistered) {
    registerRendererFonts();
    fontsRegistered = true;
  }
};

export const buildAuthorBannerCacheKey = (
  platform: string,
  id: string,
  outputType: string,
  rawQuery: Record<string, string>
): string => {
  const queryKey = Object.entries(rawQuery)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  return `banner:author:${platform.toLowerCase()}:${normalizeResourceId(platform, id)}:${outputType.toLowerCase()}:${queryKey}`;
};

export const createAuthorBannerRoute = (
  clients: AuthorClients,
  authorCache?: MemoryCache,
  bannerCache?: MemoryCache
): Hono => {
  const route = new Hono();

  route.get("/:platform/*", async (c) => {
    const { platform: rawPlatform } = c.req.param();
    const platform = rawPlatform.toUpperCase();
    const client = clients[platform];
    const pathname = new URL(c.req.url).pathname;
    const remainder = extractRouteRemainder(pathname, rawPlatform);
    if (remainder === null) {
      return c.json({ error: "Not found" }, 404);
    }

    const parts = parseResourceRoutePath(remainder);
    if (parts === null) {
      return c.json({ error: "Not found" }, 404);
    }
    const { id, action } = parts;
    const normalizedId = normalizeResourceId(platform, id);

    const getAuthor = () =>
      client === undefined
        ? Promise.resolve(null)
        : authorCache !== undefined
          ? authorCache.getOrSet(
              `author:${platform.toLowerCase()}:${normalizedId}`,
              () => client.getAuthorBannerData(normalizedId),
              { ttlMs: 30_000, cacheNull: false }
            )
          : client.getAuthorBannerData(normalizedId);

    if (action === "isValid") {
      const data = await getAuthor();
      const res = c.json({ valid: data !== null });
      res.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
      return res;
    }

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

    const data = await getAuthor();
    if (data === null) {
      return c.body(null, 404);
    }

    ensureFonts();
    const outputType = match[1].toLowerCase();
    const rawQuery = Object.fromEntries(new URL(c.req.url).searchParams.entries());
    const renderBanner = async (): Promise<Buffer> => {
      const settings = parseAuthorBannerSettings(rawQuery);
      const nodes = buildAuthorBannerNodes(data, settings);
      const surface = createCanvasSurface(AUTHOR_BANNER_WIDTH, AUTHOR_BANNER_HEIGHT);
      for (const node of nodes) {
        await renderNode(surface, node);
      }
      return outputType === "jpg" ? encodeJpg(surface) : encodePng(surface);
    };

    const buf =
      bannerCache !== undefined
        ? await bannerCache.getOrSet(
            buildAuthorBannerCacheKey(platform, normalizedId, outputType, rawQuery),
            renderBanner,
            { ttlMs: BANNER_CACHE_TTL_MS, byteEstimate: (b) => b.length }
          )
        : await renderBanner();

    return new Response(buf, {
      headers: {
        "Content-Type": outputType === "jpg" ? "image/jpeg" : "image/png",
        "Content-Length": String(buf.length),
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
      }
    });
  });

  return route;
};
